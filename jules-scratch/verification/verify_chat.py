from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:8080/trip/1/chat")
        page.wait_for_timeout(5000)
        page.screenshot(path="jules-scratch/verification/verification.png")
        browser.close()

if __name__ == "__main__":
    run()
