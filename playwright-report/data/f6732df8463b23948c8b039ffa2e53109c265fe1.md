# Page snapshot

```yaml
- generic [ref=e1]:
  - banner [ref=e3]:
    - link "⚡️ Crypto Signals" [ref=e5] [cursor=pointer]:
      - /url: /index.html
    - navigation [ref=e6]:
      - link "Live" [ref=e7] [cursor=pointer]:
        - /url: /live.html
      - link "Analytics" [ref=e8] [cursor=pointer]:
        - /url: /analytics.html
      - link "Portfolio" [ref=e9] [cursor=pointer]:
        - /url: /portfolio.html
      - link "Settings" [ref=e10] [cursor=pointer]:
        - /url: /settings.html
  - navigation "Breadcrumb" [ref=e11]:
    - list [ref=e12]
  - main [ref=e13]:
    - tablist [ref=e14]:
      - tab "Overview" [active] [selected] [ref=e15]
      - tab "Trades" [ref=e16]
    - tabpanel [ref=e17]:
      - generic [ref=e19]: LIVE
  - contentinfo [ref=e22]:
    - generic [ref=e23]:
      - text: "Version:"
      - generic [ref=e24]: loading…
    - generic [ref=e25]: •
    - link "GitHub" [ref=e26] [cursor=pointer]:
      - /url: https://github.com/your-org/crypto-signals
```