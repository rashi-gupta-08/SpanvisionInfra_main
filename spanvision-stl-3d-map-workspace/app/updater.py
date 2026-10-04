"""Updates are disabled until a Spanvision-owned release service is configured."""
import logging
import re
import requests
from .appinfo import APP_VERSION, LATEST_RELEASE_API, RELEASES_URL, SERVICES, INSTANCE_MARKER

def _parse(version: str) -> tuple[int, ...]:
    return tuple(int(n) for n in re.findall(r'\d+', version or '')[:4]) or (0,)

def check_for_update(timeout: float = 6.0) -> dict:
    enabled = bool(SERVICES.get('updaterEnabled') and LATEST_RELEASE_API and RELEASES_URL)
    result = {'current': APP_VERSION, 'latest': None, 'update_available': False,
              'url': RELEASES_URL if enabled else None, 'checked': False, 'enabled': enabled}
    if not enabled:
        return result
    try:
        response = requests.get(LATEST_RELEASE_API, timeout=timeout,
                                headers={'Accept': 'application/vnd.github+json', 'User-Agent': INSTANCE_MARKER})
        if response.status_code == 404:
            result['checked'] = True; return result
        response.raise_for_status(); data = response.json()
        latest = data.get('tag_name') or data.get('name')
        result.update(latest=latest, url=data.get('html_url') or RELEASES_URL,
                      update_available=_parse(latest) > _parse(APP_VERSION), checked=True)
    except (requests.RequestException, ValueError):
        logging.getLogger(__name__).info('Update service unavailable')
    return result
