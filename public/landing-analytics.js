(function (global) {
  const KEY = '__POSTHOG_KEY__';
  const HOST = '__POSTHOG_HOST__';
  const ID_KEY = 'tili-landing-analytics-id';
  const UTM_KEY = 'tili-attribution-utm';

  function distinctId() {
    try {
      let id = localStorage.getItem(ID_KEY);
      if (!id) {
        id = 'ld_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(ID_KEY, id);
      }
      return id;
    } catch {
      return 'ld_anon';
    }
  }

  function readUtm() {
    try {
      const raw = localStorage.getItem(UTM_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function capture(event, props) {
    if (!KEY || KEY.indexOf('__') === 0) return;
    const body = JSON.stringify({
      api_key: KEY,
      event,
      distinct_id: distinctId(),
      properties: { ...readUtm(), ...props, distinct_id: distinctId(), surface: 'landing' },
    });
    const url = HOST + '/capture/';
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(function () {});
    }
  }

  global.TiliLandingAnalytics = { capture, distinctId };
})(window);
