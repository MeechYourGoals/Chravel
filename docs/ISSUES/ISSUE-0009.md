# ISSUE-0009: Duplicate apple-mobile-web-app-capable Meta Tag

**Severity:** Minor
**Area:** PWA
**Status:** Open

## Description

`index.html` contains `<meta name="apple-mobile-web-app-capable" content="yes" />` at both line 31 and line 55.

## Fix Plan

Remove the duplicate at line 55.

## Verification

```bash
grep -c 'apple-mobile-web-app-capable' index.html
# Should return 1
```
