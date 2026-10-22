# End-to-end checks (manual)

`away-return.js` drives the hosted-style page (`artifact/index.html` with a relative `app.js`) in Chromium using a fake clock:
hatch, hide the tab, jump 2.5 hours, show the tab, and screenshot the "while you were away" path.

```
npm i --no-save playwright-core
python3 -m http.server 8097 -d artifact &        # serves index.html + app.js
CHROME=/path/to/chrome node test/e2e/away-return.js
```
