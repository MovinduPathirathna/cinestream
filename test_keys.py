import urllib.request
import json

keys = [
    'c6eec659cd6ff14b2347bfe1fd50f407'
]

for k in keys:
    try:
        url = f'https://api.themoviedb.org/3/trending/movie/day?api_key={k}'
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        res = urllib.request.urlopen(req)
        if res.status == 200:
            print(f'VALID KEY FOUND: {k}')
    except Exception as e:
        print(f'INVALID: {k}')
