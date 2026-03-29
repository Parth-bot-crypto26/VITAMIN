import sys
from bs4 import BeautifulSoup

def parse_timetable(html_file):
    with open(html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()

    soup = BeautifulSoup(html_content, 'lxml' if 'lxml' in sys.modules else 'html.parser')
    
    # Extract Course Details from the top table
    course_table = soup.find('table', class_='table')
    courses = {}
    if course_table:
        rows = course_table.find_all('tr')[1:]
        for row in rows:
            cols = row.find_all('td')
            if len(cols) > 8:
                course_text = cols[2].get_text(strip=True)
                code = course_text.split('-')[0].strip() if '-' in course_text else course_text
                title = course_text.split('-')[1].strip() if '-' in course_text else course_text
                # Remove the bracketed info from title
                if '(' in title:
                    title = title[:title.find('(')].strip()
                    
                venue = cols[7].get_text(separator=' ', strip=True)
                faculty = cols[8].get_text(separator=' ', strip=True)
                
                courses[code] = {
                    "code": code,
                    "title": title,
                    "venue": venue,
                    "faculty": faculty
                }

    # Extract Schedule grid
    time_table = soup.find('table', id='timeTableStyle')
    if not time_table:
        print("Could not find timetable grid!")
        return

    # Header timing map
    # Indices correspond to Start-End times for Theory
    theory_times = {
        2: ("08:30", "10:00"),
        3: ("10:05", "11:35"),
        4: ("11:40", "13:10"),
        6: ("13:15", "14:45"),
        7: ("14:50", "16:20"),
        8: ("16:25", "17:55"),
        9: ("18:00", "19:30")
    }
    
    # Let's extract all the colored blocks
    schedule = []
    
    days_of_week = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
    current_day = None
    row_type = None # THEORY or LAB
    
    rows = time_table.find_all('tr')
    for row in rows:
        cells = row.find_all('td')
        if not cells:
            continue
            
        first_cell_text = cells[0].get_text(strip=True)
        
        # If the row starts with a Day
        if first_cell_text in days_of_week:
            current_day = first_cell_text
            # The second cell is typically THEORY or LAB
            if len(cells) > 1:
                row_type = cells[1].get_text(strip=True)
                
                # Iterate from col index 2 onwards
                for i, cell in enumerate(cells):
                    if i < 2: continue # Skip day and type
                    
                    text = cell.get_text(strip=True)
                    if '-' in text and len(text) > 6: # Likely a class e.g. C11-PLA1006-LT...
                        
                        parts = text.split('-')
                        if len(parts) >= 4:
                            slot = parts[0]
                            code = parts[1]
                            # Try to match time based on index (rough estimation for now)
                            time = theory_times.get(i, ("Unknown", "Unknown"))
                            
                            schedule.append({
                                "day": current_day,
                                "slot": slot,
                                "course_code": code,
                                "start_time": time[0],
                                "end_time": time[1]
                            })
                            
        # Handle secondary rows like Lab rows which don't have the Day column
        elif row_type and first_cell_text in ["THEORY", "LAB"]:
            r_type = first_cell_text
            for i, cell in enumerate(cells):
                if i < 1: continue 
                text = cell.get_text(strip=True)
                if '-' in text and len(text) > 6:
                    parts = text.split('-')
                    if len(parts) >= 4:
                        code = parts[1]
                        # Time index might shift by 1 since Day column is missing
                        time = theory_times.get(i+1, ("Unknown", "Unknown"))
                        schedule.append({
                            "day": current_day,
                            "slot": parts[0],
                            "course_code": code,
                            "start_time": time[0],
                            "end_time": time[1]
                        })

    print("--- Extracted Courses ---")
    for k, v in courses.items():
        print(f"{k}: {v['title']} | {v['venue']}")
        
    print("\n--- Extracted Schedule ---")
    for s in schedule:
        title = courses.get(s['course_code'], {}).get('title', 'Unknown Title')
        print(f"{s['day']} {s['start_time']} - {s['end_time']}: {s['course_code']} ({title}) [Slot: {s['slot']}]")

if __name__ == "__main__":
    parse_timetable('../timetable_response.html')
    
    # Parse Semesters
    print("\\n--- Semesters ---")
    with open('../choose_attendance_response.html', 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')
        select = soup.find('select', id='semesterSubId')
        if select:
            for opt in select.find_all('option'):
                val = opt.get('value')
                if val:
                    print(f"{val} -> {opt.get_text(strip=True)}")

    # Parse Attendance
    print("\\n--- Attendance ---")
    with open('../attendance_response.html', 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')
        table = soup.find('table', id='AttendanceDetailDataTable')
        if table:
            for row in table.find('tbody').find_all('tr'):
                cols = row.find_all('td')
                if len(cols) >= 8:
                    course_text = cols[2].get_text(strip=True)
                    course_code = course_text.split('-')[0].strip() if '-' in course_text else course_text
                    
                    attended = cols[5].get_text(strip=True)
                    total = cols[6].get_text(strip=True)
                    percentage = cols[7].get_text(strip=True)
                    
                    print(f"{course_code}: {attended}/{total} ({percentage})")
