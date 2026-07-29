package googlebot

import "testing"

func TestPathAllowedByRobots(t *testing.T) {
	body := `User-agent: Googlebot
Disallow: /private/
Allow: /private/public.html

User-agent: *
Disallow: /admin/
`
	if !pathAllowedByRobots(body, "/about", DeviceDesktop) {
		t.Fatal("expected /about allowed for desktop googlebot")
	}
	if pathAllowedByRobots(body, "/private/page", DeviceDesktop) {
		t.Fatal("expected /private/page disallowed")
	}
	if !pathAllowedByRobots(body, "/private/public.html", DeviceDesktop) {
		t.Fatal("expected longer Allow rule to win")
	}
}

func TestSameURL(t *testing.T) {
	if !sameURL("https://example.com/page/", "https://example.com/page") {
		t.Fatal("trailing slash should match")
	}
	if sameURL("https://example.com/a", "https://example.com/b") {
		t.Fatal("different paths should not match")
	}
}

func TestResolveProfileCustom(t *testing.T) {
	p := resolveProfile(ProfileCustom, "Mozilla/5.0 (Linux; Android 13; Pixel 7)")
	if p.Device != DeviceMobile {
		t.Fatalf("expected mobile device, got %s", p.Device)
	}
	if p.ViewportWidth != 412 {
		t.Fatalf("expected mobile viewport 412, got %d", p.ViewportWidth)
	}
}

func TestExtractHeadings(t *testing.T) {
	html := `<html><body><h1>One</h1><h2>Two</h2><h4>Skip</h4></body></html>`
	headings := extractHeadings(html)
	if len(headings) != 2 {
		t.Fatalf("expected 2 headings, got %d", len(headings))
	}
	if headings[0].Level != 1 || headings[0].Text != "One" {
		t.Fatalf("unexpected first heading: %+v", headings[0])
	}
}
