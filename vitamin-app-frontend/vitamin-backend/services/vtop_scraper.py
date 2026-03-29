import httpx
from bs4 import BeautifulSoup
import asyncio
import logging

logger = logging.getLogger(__name__)

import re
from typing import Dict, Any

async def scrape_vtop_data(payload: Dict[str, Any], current_user):
    """
    Parses the massive HTML payload map provided by the frontend WebView natively.
    """
    logger.info(f"Starting VTOP scrape for {current_user.registration_number}")
    
    try:
        from models import Schedule
        from bs4 import BeautifulSoup
        
        # 1. Clear old schedules
        await Schedule.find({"owner_id": current_user.registration_number}).delete()
        
        # 2. Parse Timetables
        timetables = payload.get('timetables', {})
        total_courses_saved = 0
        schedules_to_insert = []
        for sem, html in timetables.items():
            soup = BeautifulSoup(html, 'html.parser')
            table = soup.find('table', {'class': 'table'})
            if not table: continue
            
            rows = table.find_all('tr')[1:]
            for row in rows:
                cols = row.find_all('td')
                if len(cols) < 12: continue
                
                course_p = cols[2].find_all('p')
                course_name = course_p[0].text.strip() if course_p else cols[2].text.strip()
                
                slot_venue_p = cols[7].find_all('p')
                slot = slot_venue_p[0].text.strip().replace(" -", "") if slot_venue_p else ""
                venue = slot_venue_p[1].text.strip() if len(slot_venue_p) > 1 else ""
                
                new_sch = Schedule(
                    time=slot,
                    title=course_name,
                    loc=venue,
                    type="Theory",
                    status="Live",
                    semester=sem,
                    owner_id=current_user.registration_number
                )
                schedules_to_insert.append(new_sch)
                total_courses_saved += 1
                
        if schedules_to_insert:
            await Schedule.insert_many(schedules_to_insert)
                
        # 3. Parse Attendance
        attendances = payload.get('attendance', {})
        total_percentage = 0.0
        count = 0
        
        # We assume the last semester processed is the "current" one
        latest_sem = ""
        for sem, html in attendances.items():
            latest_sem = sem
            soup = BeautifulSoup(html, 'html.parser')
            table = soup.find('table', {'id': 'AttendanceDetailDataTable'})
            if not table: continue
            
            rows = table.find('tbody').find_all('tr')
            for row in rows:
                cols = row.find_all('td')
                if len(cols) < 9: continue
                
                perc_str = cols[7].text.strip().replace('%', '')
                try:
                    perc = float(perc_str)
                    total_percentage += perc
                    count += 1
                except: pass
                
        if count > 0:
            avg_attendance = total_percentage / count
            current_user.attendance = avg_attendance
            
        current_user.current_semester = latest_sem
        await current_user.save()
        
        logger.info(f"VTOP Data scraping completed. Saved {total_courses_saved} classes to MongoDB.")
        
        return {
            "status": "success",
            "message": f"Successfully synced {total_courses_saved} classes into MongoDB"
        }
    except Exception as e:
        logger.error(f"Error occurred during VTOP HTML parsing for {current_user.registration_number}: {str(e)}")
        raise e
