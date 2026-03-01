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
        - paragraph [ref=e15]: Invalid email or password. Please check your credentials and try again.
        - paragraph [ref=e16]: Check your email for a confirmation link
      - generic [ref=e17]:
        - button "Sign In" [ref=e18] [cursor=pointer]
        - button "Sign Up" [ref=e19] [cursor=pointer]
      - button "Continue with Google" [ref=e20] [cursor=pointer]:
        - img [ref=e21]
        - generic [ref=e26]: Continue with Google
      - generic [ref=e29]: or
      - generic [ref=e31]:
        - generic [ref=e32]:
          - generic [ref=e33]: Email
          - generic [ref=e34]:
            - img [ref=e35]
            - textbox "your@email.com" [ref=e38]: nonexistent@test.chravel.com
        - generic [ref=e39]:
          - generic [ref=e40]: Password
          - generic [ref=e41]:
            - textbox "••••••••" [ref=e42]: WrongPassword123!
            - button [ref=e43] [cursor=pointer]:
              - img [ref=e44]
          - button "Forgot password?" [ref=e48] [cursor=pointer]
        - button "Sign In" [ref=e49] [cursor=pointer]
```