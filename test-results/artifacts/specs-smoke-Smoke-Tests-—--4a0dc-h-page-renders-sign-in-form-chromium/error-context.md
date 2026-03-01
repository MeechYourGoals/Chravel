# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - main [ref=e4]:
    - generic [ref=e7]:
      - generic [ref=e8]:
        - heading "Welcome Back" [level=2] [ref=e9]
        - button [ref=e10] [cursor=pointer]:
          - img [ref=e11]
      - generic [ref=e14]:
        - button "Sign In" [ref=e15] [cursor=pointer]
        - button "Sign Up" [ref=e16] [cursor=pointer]
      - button "Continue with Google" [ref=e17] [cursor=pointer]:
        - img [ref=e18]
        - generic [ref=e23]: Continue with Google
      - generic [ref=e26]: or
      - generic [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e30]: Email
          - generic [ref=e31]:
            - img [ref=e32]
            - textbox "your@email.com" [active] [ref=e35]
        - generic [ref=e36]:
          - generic [ref=e37]: Password
          - generic [ref=e38]:
            - textbox "••••••••" [ref=e39]
            - button [ref=e40] [cursor=pointer]:
              - img [ref=e41]
          - button "Forgot password?" [ref=e45] [cursor=pointer]
        - button "Sign In" [ref=e46] [cursor=pointer]
```