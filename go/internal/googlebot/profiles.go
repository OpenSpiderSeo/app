package googlebot

import "strings"

type Device string

const (
	DeviceDesktop Device = "desktop"
	DeviceMobile  Device = "mobile"
)

type ProfileDef struct {
	ID            string
	Device        Device
	UserAgent     string
	ViewportWidth int
}

type LanguageDef struct {
	ID             string
	AcceptLanguage string
}

const defaultAcceptLanguage = "en-US,en;q=0.9"

const (
	ProfileGooglebotDesktop = "googlebot-desktop"
	ProfileGooglebotSmart   = "googlebot-smart"
	ProfileChromeDesktop    = "chrome-desktop"
	ProfileChromeMobile     = "chrome-mobile"
	ProfileCustom           = "custom"
)

var profiles = []ProfileDef{
	{
		ID:            ProfileGooglebotDesktop,
		Device:        DeviceDesktop,
		UserAgent:     "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
		ViewportWidth: 1280,
	},
	{
		ID:            ProfileGooglebotSmart,
		Device:        DeviceMobile,
		UserAgent:     "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
		ViewportWidth: 412,
	},
	{
		ID:            ProfileChromeDesktop,
		Device:        DeviceDesktop,
		UserAgent:     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
		ViewportWidth: 1280,
	},
	{
		ID:            ProfileChromeMobile,
		Device:        DeviceMobile,
		UserAgent:     "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
		ViewportWidth: 412,
	},
}

var languages = []LanguageDef{
	{ID: "ru", AcceptLanguage: "ru-RU,ru;q=0.9,en;q=0.5"},
	{ID: "en", AcceptLanguage: "en-US,en;q=0.9"},
	{ID: "de", AcceptLanguage: "de-DE,de;q=0.9,en;q=0.5"},
	{ID: "fr", AcceptLanguage: "fr-FR,fr;q=0.9,en;q=0.5"},
	{ID: "es", AcceptLanguage: "es-ES,es;q=0.9,en;q=0.5"},
	{ID: "pt", AcceptLanguage: "pt-BR,pt;q=0.9,en;q=0.5"},
	{ID: "it", AcceptLanguage: "it-IT,it;q=0.9,en;q=0.5"},
	{ID: "pl", AcceptLanguage: "pl-PL,pl;q=0.9,en;q=0.5"},
	{ID: "uk", AcceptLanguage: "uk-UA,uk;q=0.9,ru;q=0.6,en;q=0.4"},
	{ID: "tr", AcceptLanguage: "tr-TR,tr;q=0.9,en;q=0.5"},
	{ID: "zh", AcceptLanguage: "zh-CN,zh;q=0.9,en;q=0.5"},
	{ID: "ja", AcceptLanguage: "ja-JP,ja;q=0.9,en;q=0.5"},
	{ID: "ko", AcceptLanguage: "ko-KR,ko;q=0.9,en;q=0.5"},
	{ID: "ar", AcceptLanguage: "ar-SA,ar;q=0.9,en;q=0.5"},
}

var defaultCompareLanguages = []string{"ru", "en", "de"}

type resolvedProfile struct {
	ID            string
	Device        Device
	UserAgent     string
	ViewportWidth int
}

func resolveProfile(profileID, customUA string) resolvedProfile {
	if profileID == ProfileCustom {
		ua := strings.TrimSpace(customUA)
		if ua == "" {
			ua = profiles[0].UserAgent
		}
		mobile := mobileUA(ua)
		return resolvedProfile{
			ID:            ProfileCustom,
			Device:        deviceOf(mobile),
			UserAgent:     ua,
			ViewportWidth: viewportOf(mobile),
		}
	}
	for _, p := range profiles {
		if p.ID == profileID {
			return resolvedProfile{
				ID:            p.ID,
				Device:        p.Device,
				UserAgent:     p.UserAgent,
				ViewportWidth: p.ViewportWidth,
			}
		}
	}
	p := profiles[0]
	return resolvedProfile{
		ID:            p.ID,
		Device:        p.Device,
		UserAgent:     p.UserAgent,
		ViewportWidth: p.ViewportWidth,
	}
}

func languageByID(id string) (LanguageDef, bool) {
	for _, l := range languages {
		if l.ID == id {
			return l, true
		}
	}
	return LanguageDef{}, false
}

func mobileUA(ua string) bool {
	lower := strings.ToLower(ua)
	return strings.Contains(lower, "mobile") ||
		strings.Contains(lower, "android") ||
		strings.Contains(lower, "iphone") ||
		strings.Contains(lower, "ipad")
}

func deviceOf(mobile bool) Device {
	if mobile {
		return DeviceMobile
	}
	return DeviceDesktop
}

func viewportOf(mobile bool) int {
	if mobile {
		return 412
	}
	return 1280
}
