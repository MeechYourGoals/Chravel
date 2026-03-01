# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - main [ref=e4]:
    - generic [ref=e6]:
      - img [ref=e7]
      - heading "Connection error" [level=1] [ref=e14]
      - paragraph [ref=e15]: We couldn't load the invite details. Check your connection and try again.
      - button "Try Again" [ref=e16] [cursor=pointer]:
        - img [ref=e17]
        - text: Try Again
      - button "Go to Dashboard" [ref=e22] [cursor=pointer]
```