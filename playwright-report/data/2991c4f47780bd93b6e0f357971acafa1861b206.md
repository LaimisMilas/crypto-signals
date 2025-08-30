# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Service Health" [level=1] [ref=e2]
  - generic [ref=e3]:
    - strong [ref=e6]: offline
    - table [ref=e7]:
      - rowgroup [ref=e8]:
        - row "Env Present" [ref=e9]:
          - cell "Env" [ref=e10]
          - cell "Present" [ref=e11]
      - rowgroup
    - table [ref=e12]:
      - rowgroup [ref=e13]:
        - row "Key Value" [ref=e14]:
          - cell "Key" [ref=e15]
          - cell "Value" [ref=e16]
      - rowgroup
    - generic [ref=e17]:
      - text: "Parsisiųsti CSV/JSON:"
      - link "backtest.csv" [ref=e18] [cursor=pointer]:
        - /url: /download/backtest.csv
      - text: ·
      - link "optimize.csv" [ref=e19] [cursor=pointer]:
        - /url: /download/optimize.csv
      - text: ·
      - link "walkforward-agg.csv" [ref=e20] [cursor=pointer]:
        - /url: /download/walkforward-agg.csv
      - text: ·
      - link "walkforward-summary.json" [ref=e21] [cursor=pointer]:
        - /url: /download/walkforward-summary.json
      - text: ·
      - link "metrics.json" [ref=e22] [cursor=pointer]:
        - /url: /download/metrics.json
```