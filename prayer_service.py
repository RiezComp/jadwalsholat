import requests
import json
import os
import datetime
from datetime import date

CACHE_FILE = 'schedule_cache.json'

class PrayerService:
    def __init__(self, config_path='config.json'):
        self.config = self._load_config(config_path)

    def _load_config(self, path):
        with open(path, 'r') as f:
            return json.load(f)

    def get_schedule(self):
        # Try to get from cache first
        today_str = date.today().strftime("%d-%m-%Y")
        
        cached_data = self._load_cache()
        if cached_data:
            # Check if today exists in cache
            if today_str in cached_data:
                print(f"Loading schedule for {today_str} from cache.")
                return cached_data[today_str]
        
        # If not in cache or cache missing, fetch from API
        print("Fetching schedule from LIVE API...")
        data = self._fetch_from_api()
        
        if data:
            self._save_to_cache(data)
            # Return today's data from the newly fetched data
            # API returns data keyed by date, usually.
            # Aladhan 'By City' API returns data for the whole month if not specified, 
            # but let's just fetch for the current month/year to be safe and cache it.
            # NOTE: For simplicity in this 'get_schedule' call, we just return the specific day if possible.
            # But the structure from API might be a list.
            
            # Let's map the API response structure to our simple key-value cache
            # API Response 'data' is usually a list of days for the month.
            
            # Re-read cache because _save_to_cache formats it for us
            new_cache = self._load_cache()
            return new_cache.get(today_str, None)
            
        return None

    def _fetch_from_api(self):
        # Using Aladhan API
        # https://api.aladhan.com/v1/calendarByCity/2025/12?city=Bandung&country=Indonesia&method=3
        
        city = self.config.get('city', 'Bandung')
        country = self.config.get('country', 'Indonesia')
        method = self.config.get('method', 5) # 5 is Egyptian, 3 is Muslim World League. Defaulting to config.
        
        current_date = date.today()
        month = current_date.month
        year = current_date.year
        
        url = f"http://api.aladhan.com/v1/calendarByCity/{year}/{month}?city={city}&country={country}&method={method}"
        
        try:
            response = requests.get(url)
            response.raise_for_status()
            return response.json()['data']
        except Exception as e:
            print(f"Error fetching API: {e}")
            return None

    def _load_cache(self):
        if not os.path.exists(CACHE_FILE):
            return {}
        try:
            with open(CACHE_FILE, 'r') as f:
                return json.load(f)
        except:
            return {}

    def _save_to_cache(self, api_data):
        # api_data is a list of objects from Aladhan
        # We will transform it to a simple dict: "DD-MM-YYYY": {timings...}
        
        cache = self._load_cache()
        
        for item in api_data:
            # Date in API response: item['date']['gregorian']['date'] -> "20-12-2025"
            date_str = item['date']['gregorian']['date']
            timings = item['timings']
            
            # Clean up timings (remove (WIB) etc if present, usually it's just time)
            # Aladhan returns "04:13 (WIB)", we want just "04:13"
            clean_timings = {}
            for k, v in timings.items():
                clean_timings[k] = v.split()[0]
                
            cache[date_str] = clean_timings
            
        with open(CACHE_FILE, 'w') as f:
            json.dump(cache, f, indent=4)
            
if __name__ == "__main__":
    svc = PrayerService()
    print(svc.get_schedule())
