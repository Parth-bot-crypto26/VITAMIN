import re
import logging
from typing import Dict, Any
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


# Semester ID → human-readable label mapping helper
def sem_id_to_label(sem_id: str) -> str:
    """Convert VTOP semester ID like BL20252605 to 'Winter Semester 2025-26'."""
    season_map = {
        "01": "Fall Semester",
        "04": "Interim Semester",
        "05": "Winter Semester",
        "13": "Fall Inter Semester - II",
        "12": "Fall Inter Semester - I",
    }
    try:
        year1 = sem_id[2:6]       # e.g. "2025"
        year2 = sem_id[6:8]       # e.g. "26"
        code = sem_id[8:10]       # e.g. "05"
        label = season_map.get(code, f"Semester {code}")
        return f"{label} {year1}-{year2}"
    except Exception:
        return sem_id


def is_current_semester(sem_id: str, all_sem_ids: list) -> bool:
    """
    Returns True if this semId is the most recent one.
    Sort by semId numerically descending — the largest is the current one.
    """
    sorted_sems = sorted(all_sem_ids, reverse=True)
    return sem_id == sorted_sems[0] if sorted_sems else False


async def scrape_vtop_data(payload: Dict[str, Any], current_user):
    """
    Parses the HTML payload map from the WebView.
    
    Timetable structure per row (confirmed from VTOP screenshots):
      col[0] = Sl.No
      col[1] = Class Group (e.g. General)
      col[2] = Course (code in <p> children, name in subsequent <p>)
              → inner <p>[0] = "CSA3006"
              → inner <p>[1] = "DATA MINING AND DATA WAREHOUSING"
              → inner <p>[2] = "( Lecture and Tutorial ,practical hours only )"
      col[3] = LT/PJ/C values (stacked)
      col[4] = Category
      col[5] = Course Option
      col[6] = Class Id (e.g. BL2025260500536)
      col[7] = Slot / Venue  → p[0]=slot, p[1]=venue
      col[8] = Faculty Details → text has "RUDRA KALYAN NAYAK - SCAI"
      col[9] = Registered / Updated Date & Time
      col[10] = Attendance Date / Type
      col[11] = Status & Ref. No.

    Attendance structure (AttendanceDetailDataTable):
      col[0] = #
      col[1] = Course Code (e.g. CSA3006)
      col[2] = Course Title  
      col[3] = Course Type (LTP/LT/LP)
      col[4] = Class Detail (e.g. "BL2025260500536 - C14+E11+E12 - AB02-423")
      col[5] = Classes Present
      col[6] = Total Classes
      col[7] = Attendance %
      col[8] = Remarks
    """
    logger.info(f"Starting VTOP scrape for {current_user.registration_number}")

    try:
        from models import Schedule, Grade

        # 1. Clear old data
        await Schedule.find({"owner_id": current_user.registration_number}).delete()
        await Grade.find({"owner_id": current_user.registration_number}).delete()

        # 2. Parse Timetables
        timetables = payload.get('timetables', {})
        schedules_to_insert = []
        sem_ids = list(timetables.keys())
        current_sem_id = sorted(sem_ids, reverse=True)[0] if sem_ids else ""
        current_sem_label = sem_id_to_label(current_sem_id) if current_sem_id else ""
        logger.info(f"Current semester detected: {current_sem_id} → '{current_sem_label}'")

        for sem_id, html in timetables.items():
            sem_label = sem_id_to_label(sem_id)
            soup = BeautifulSoup(html, 'html.parser')
            table = soup.find('table', {'class': 'table'})
            if not table:
                logger.warning(f"  No timetable table found for {sem_id}")
                continue

            rows = table.find_all('tr')[1:]  # skip header
            logger.info(f"  TT[{sem_id}]: {len(rows)} rows to parse")

            for row in rows:
                cols = row.find_all('td')
                if len(cols) < 9:
                    continue

                # Course code + name from col[2]
                course_ps = cols[2].find_all('p')
                if course_ps:
                    course_code = course_ps[0].get_text(strip=True)
                    course_name = course_ps[1].get_text(strip=True) if len(course_ps) > 1 else course_code
                    course_type_text = course_ps[2].get_text(strip=True) if len(course_ps) > 2 else ""
                else:
                    raw = cols[2].get_text(" ", strip=True)
                    course_code = raw
                    course_name = raw
                    course_type_text = ""

                # Course type = LT/LTP/LP from col[3] stacked lines
                lt_text = " ".join(p.get_text(strip=True) for p in cols[3].find_all('p')) or cols[3].get_text(strip=True)
                # Simplify: if has both L and P → LTP, else LT or LP
                if 'P' in lt_text and 'T' in lt_text:
                    course_type = "LTP"
                elif 'P' in lt_text:
                    course_type = "LP"
                else:
                    course_type = "LT"

                # Class ID from col[6]
                class_id_ps = cols[6].find_all('p')
                class_id = class_id_ps[0].get_text(strip=True) if class_id_ps else cols[6].get_text(strip=True)

                # Slot + Venue from col[7]
                slot_ps = cols[7].find_all('p')
                slot = slot_ps[0].get_text(strip=True).replace(" -", "") if slot_ps else ""
                venue = slot_ps[1].get_text(strip=True) if len(slot_ps) > 1 else ""

                # Faculty from col[8]
                faculty_text = cols[8].get_text(" ", strip=True)
                # Typically "RUDRA KALYAN NAYAK - SCAI" → take everything before " - " as name
                faculty_parts = faculty_text.split(" - ")
                faculty_name = faculty_parts[0].strip() if faculty_parts else faculty_text
                school = faculty_parts[1].strip() if len(faculty_parts) > 1 else ""

                # Full title for display includes course code
                display_title = f"{course_code} - {course_name}" if course_code and course_name != course_code else course_name

                new_sch = Schedule(
                    time=slot,
                    title=display_title,
                    loc=venue,
                    type=course_type,
                    status="Live" if sem_id == current_sem_id else "Done",
                    semester=sem_label,
                    owner_id=current_user.registration_number,
                    class_id=class_id,
                    attended_classes=0,
                    total_classes=0,
                    attendance_percentage=0,
                    faculty_name=faculty_name,
                    school=school,
                    course_code=course_code,
                    course_name=course_name,
                )
                schedules_to_insert.append(new_sch)

        # Build class_id → schedule lookup for attendance overlay
        sch_dict = {sch.class_id: sch for sch in schedules_to_insert if sch.class_id}
        logger.info(f"  Total schedule entries: {len(schedules_to_insert)} across {len(timetables)} semesters")
        logger.info(f"  Class ID index size: {len(sch_dict)}")

        # 3. Parse Attendance
        attendances = payload.get('attendance', {})
        total_pct = 0.0
        att_count = 0

        for sem_id, html in attendances.items():
            sem_label = sem_id_to_label(sem_id)
            soup = BeautifulSoup(html, 'html.parser')
            
            # Try primary table ID first
            att_table = soup.find('table', {'id': 'AttendanceDetailDataTable'})
            if not att_table:
                # fallback: any table with attendance columns
                att_table = soup.find('table', class_='table')
            if not att_table:
                logger.warning(f"  No attendance table found for {sem_id}")
                continue

            tbody = att_table.find('tbody')
            if not tbody:
                logger.warning(f"  Attendance table has no tbody for {sem_id}")
                continue

            rows = tbody.find_all('tr')
            logger.info(f"  ATT[{sem_id}]: {len(rows)} rows")

            for row in rows:
                cols = row.find_all('td')
                if len(cols) < 8:
                    continue

                # col[4] = "BL2025260500536 - C14+E11+E12 - AB02-423"
                class_detail_raw = cols[4].get_text(strip=True) if len(cols) > 4 else ""
                att_class_id = class_detail_raw.split(' - ')[0].strip()

                # Try columns 5, 6, 7 for present/total/percentage
                try:
                    attended = int(cols[5].get_text(strip=True))
                    total = int(cols[6].get_text(strip=True))
                    perc_raw = cols[7].get_text(strip=True).replace('%', '').strip()
                    perc = int(float(perc_raw)) if perc_raw else (int(attended/total*100) if total else 0)

                    total_pct += perc
                    att_count += 1

                    if att_class_id in sch_dict:
                        sch_dict[att_class_id].attended_classes = attended
                        sch_dict[att_class_id].total_classes = total
                        sch_dict[att_class_id].attendance_percentage = perc
                        logger.debug(f"    Matched {att_class_id}: {attended}/{total} ({perc}%)")
                    else:
                        logger.debug(f"    No schedule match for class_id: '{att_class_id}'")
                except (ValueError, IndexError) as e:
                    logger.debug(f"    Skipping row (parse error): {e}")
                    continue

        # Update user attendance average and current semester
        if att_count > 0:
            current_user.attendance = round(total_pct / att_count, 1)
            logger.info(f"  Average attendance: {current_user.attendance}%")
        
        current_user.current_semester = current_sem_label
        logger.info(f"  Saving current semester label: '{current_sem_label}'")

        # 4. Parse Grade History & CGPA
        grades_html = payload.get('grades', '')
        grades_to_insert = []
        cgpa_from_grades = None

        if grades_html:
            soup = BeautifulSoup(grades_html, 'html.parser')
            
            # Look for current CGPA in the grade history page
            cgpa_text = soup.get_text()
            cgpa_match = re.search(r'CGPA\s*[:\-]?\s*(\d+\.\d+)', cgpa_text, re.IGNORECASE)
            if cgpa_match:
                try:
                    cgpa_from_grades = float(cgpa_match.group(1))
                    logger.info(f"  CGPA from grades page: {cgpa_from_grades}")
                except:
                    pass

            all_tables = soup.find_all('table', class_='customTable')
            logger.info(f"  Grade tables found: {len(all_tables)}")

            # The effective grades table is index 1 (index 0 is student info header)
            for table_idx in [1, 0]:
                if table_idx >= len(all_tables):
                    continue
                grades_table = all_tables[table_idx]
                rows = grades_table.find_all('tr', class_='tableContent')
                if not rows:
                    rows = grades_table.find_all('tr')[1:]  # skip header
                
                logger.info(f"  Grade rows in table[{table_idx}]: {len(rows)}")

                for row in rows:
                    cols = row.find_all('td')
                    if len(cols) < 8:
                        continue

                    course_code = cols[1].get_text(strip=True)
                    course_title = cols[2].get_text(strip=True)
                    course_type = cols[3].get_text(strip=True)
                    grade = cols[5].get_text(strip=True)
                    exam_month = cols[6].get_text(strip=True)
                    result_declared = cols[7].get_text(strip=True)

                    try:
                        credits = float(cols[4].get_text(strip=True))
                    except:
                        credits = 0.0

                    # Validate course code format (e.g. CSA3006, MAT2003, HUM1002)
                    if not re.match(r'^[A-Z]{2,4}\d{4}$', course_code):
                        continue
                    if not grade:
                        continue

                    from models import Grade as GradeModel
                    grades_to_insert.append(GradeModel(
                        owner_id=current_user.registration_number,
                        course_code=course_code,
                        course_title=course_title,
                        course_type=course_type,
                        credits=credits,
                        grade=grade,
                        exam_month=exam_month,
                        result_declared=result_declared
                    ))

                if grades_to_insert:
                    break  # found data in this table, stop

        # 5. Parse Academic Calendar (if provided)
        calendar_html = payload.get('calendar', '')
        calendar_events = []
        if calendar_html:
            cal_events = parse_academic_calendar(calendar_html, current_user.registration_number, current_sem_label)
            if cal_events:
                from models import AcademicEvent
                await AcademicEvent.find({"owner_id": current_user.registration_number}).delete()
                await AcademicEvent.insert_many(cal_events)
                calendar_events = cal_events
                logger.info(f"  Inserted {len(cal_events)} academic calendar events")

        # Update CGPA if extracted
        if cgpa_from_grades:
            current_user.cgpa = cgpa_from_grades

        await current_user.save()

        # 6. Bulk insert
        if schedules_to_insert:
            await Schedule.insert_many(schedules_to_insert)
            logger.info(f"  Inserted {len(schedules_to_insert)} schedule entries")

        if grades_to_insert:
            await Grade.insert_many(grades_to_insert)
            logger.info(f"  Inserted {len(grades_to_insert)} grade entries")

        summary = {
            "status": "success",
            "schedules": len(schedules_to_insert),
            "grades": len(grades_to_insert),
            "calendar_events": len(calendar_events),
            "attendance_courses": att_count,
            "avg_attendance": current_user.attendance,
            "cgpa": current_user.cgpa,
            "current_semester": current_sem_label,
            "message": (
                f"Synced {len(schedules_to_insert)} classes, "
                f"{len(grades_to_insert)} grade records, "
                f"{len(calendar_events)} calendar events. "
                f"Semester: {current_sem_label}. "
                f"Avg attendance: {current_user.attendance:.1f}%. CGPA: {current_user.cgpa}"
            )
        }
        logger.info(f"VTOP scrape complete: {summary}")
        return summary

    except Exception as e:
        logger.error(f"Error during VTOP scrape for {current_user.registration_number}: {e}", exc_info=True)
        raise e


def parse_academic_calendar(html: str, owner_id: str, semester: str) -> list:
    """
    Parse the VTOP academic calendar HTML.
    Returns a list of AcademicEvent objects.
    """
    from models import AcademicEvent
    import re

    events = []
    try:
        soup = BeautifulSoup(html, 'html.parser')
        tables = soup.find_all('table')

        # Known event keywords
        HOLIDAY_KEYWORDS = ['holiday', 'vacation', 'leave', 'recess', 'public', 'independence', 'republic', 'diwali', 'dussehra', 'eid', 'christmas', 'pongal', 'holi', 'weekend']
        EXAM_KEYWORDS = ['exam', 'fat', 'cat', 'cia', 'test', 'quiz', 'assessment', 'midterm', 'end semester']
        FEST_KEYWORDS = ['fest', 'event', 'culturals', 'tech', 'sports', 'symposium', 'conference']

        def classify_event(text: str) -> str:
            t = text.lower()
            if any(k in t for k in EXAM_KEYWORDS): return 'exam'
            if any(k in t for k in HOLIDAY_KEYWORDS): return 'holiday'
            if any(k in t for k in FEST_KEYWORDS): return 'fest'
            if 'working saturday' in t or 'compensatory' in t: return 'working_saturday'
            return 'general'

        # Try to find date cells and event descriptions
        date_patterns = [
            r'(\d{2})[/-](\d{2})[/-](\d{4})',   # DD/MM/YYYY or DD-MM-YYYY
            r'(\d{4})[/-](\d{2})[/-](\d{2})',   # YYYY-MM-DD
        ]

        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if len(cells) < 2:
                    continue

                # Look for a date in any cell
                date_str = None
                event_desc = ''

                for cell in cells:
                    cell_text = cell.get_text(separator=' ', strip=True)
                    if not date_str:
                        for pat in date_patterns:
                            m = re.search(pat, cell_text)
                            if m:
                                try:
                                    if len(m.group(1)) == 4:  # YYYY-MM-DD
                                        date_str = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
                                    else:  # DD/MM/YYYY
                                        date_str = f"{m.group(3)}-{m.group(2).zfill(2)}-{m.group(1).zfill(2)}"
                                except Exception:
                                    pass
                                break
                    else:
                        # This cell is the description
                        if event_desc == '' and cell_text and len(cell_text) > 3:
                            event_desc = cell_text[:200]

                if date_str and event_desc:
                    event_type = classify_event(event_desc)
                    events.append(AcademicEvent(
                        owner_id=owner_id,
                        date=date_str,
                        event_type=event_type,
                        description=event_desc,
                        semester=semester,
                    ))

        logger.info(f"  Parsed {len(events)} academic calendar events from HTML ({len(html)} bytes)")
    except Exception as e:
        logger.warning(f"Calendar parse failed: {e}")

    return events
