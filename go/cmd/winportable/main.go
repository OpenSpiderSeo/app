// Windows portable launcher: embeds the full OpenSpider folder (host + resources.neu + extensions)
// as payload.zip, extracts to %LOCALAPPDATA%\OpenSpider\app\<version>\ and runs OpenSpider.exe.
//
// Build: write payload.zip next to this file, then:
//   GOOS=windows GOARCH=amd64 go build -o OpenSpider-windows-x64.exe ./cmd/winportable
package main

import (
	"archive/zip"
	"bytes"
	_ "embed"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

//go:embed payload.zip
var payload []byte

// Set at link time: -ldflags "-X main.version=1.0.1"
var version = "dev"

func main() {
	if runtime.GOOS != "windows" && os.Getenv("OPENSPIDER_FORCE_PORTABLE") == "" {
		// Cross-compiled binary still targets Windows paths; allow override for tests.
	}

	base, err := os.UserConfigDir()
	if err != nil || base == "" {
		base = os.TempDir()
	}
	// Prefer LOCALAPPDATA on Windows (UserConfigDir is AppData\Roaming).
	if la := os.Getenv("LOCALAPPDATA"); la != "" {
		base = la
	}

	ver := strings.TrimSpace(version)
	if ver == "" {
		ver = "dev"
	}
	appDir := filepath.Join(base, "OpenSpider", "app", ver)
	host := filepath.Join(appDir, "OpenSpider.exe")
	marker := filepath.Join(appDir, ".payload-ok")

	needExtract := true
	if st, err := os.Stat(host); err == nil && st.Size() > 100_000 {
		if _, err := os.Stat(filepath.Join(appDir, "resources.neu")); err == nil {
			if _, err := os.Stat(marker); err == nil {
				needExtract = false
			}
		}
	}

	if needExtract {
		if err := os.RemoveAll(appDir); err != nil && !os.IsNotExist(err) {
			fatal("cleanup extract dir: %v", err)
		}
		if err := os.MkdirAll(appDir, 0o755); err != nil {
			fatal("create extract dir: %v", err)
		}
		if err := unzipBytes(payload, appDir); err != nil {
			fatal("extract payload: %v", err)
		}
		// Normalize host name for a clear Start Menu / Explorer label.
		if err := ensureHostName(appDir); err != nil {
			fatal("normalize host: %v", err)
		}
		if _, err := os.Stat(host); err != nil {
			fatal("OpenSpider.exe missing after extract in %s", appDir)
		}
		if _, err := os.Stat(filepath.Join(appDir, "resources.neu")); err != nil {
			fatal("resources.neu missing — refuse to start (would show blank Neutralino UI)")
		}
		_ = os.WriteFile(marker, []byte(ver+"\n"), 0o644)
	}

	cmd := exec.Command(host)
	cmd.Dir = appDir
	cmd.Stdout = nil
	cmd.Stderr = nil
	if err := cmd.Start(); err != nil {
		fatal("start OpenSpider: %v", err)
	}
	// Exit launcher after child starts (no console flash / no wait).
}

func ensureHostName(appDir string) error {
	target := filepath.Join(appDir, "OpenSpider.exe")
	if st, err := os.Stat(target); err == nil && st.Size() > 100_000 {
		return nil
	}
	candidates := []string{
		"openspider-win_x64.exe",
		"openspider-win_arm64.exe",
	}
	for _, name := range candidates {
		src := filepath.Join(appDir, name)
		if st, err := os.Stat(src); err == nil && st.Size() > 100_000 {
			return os.Rename(src, target)
		}
	}
	// Already only OpenSpider.exe or unexpected layout
	entries, _ := os.ReadDir(appDir)
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		n := e.Name()
		if strings.HasSuffix(strings.ToLower(n), ".exe") && strings.Contains(strings.ToLower(n), "openspider") && n != "OpenSpider.exe" {
			// Skip extension sidecar
			if strings.Contains(strings.ToLower(n), "extensions") {
				continue
			}
			return os.Rename(filepath.Join(appDir, n), target)
		}
	}
	return fmt.Errorf("no Neutralino host exe found in %s", appDir)
}

func unzipBytes(data []byte, dest string) error {
	r, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return err
	}
	for _, f := range r.File {
		name := f.Name
		// Zip slip guard
		clean := filepath.Clean(name)
		if strings.HasPrefix(clean, "..") {
			return fmt.Errorf("refusing path %q", name)
		}
		outPath := filepath.Join(dest, clean)
		if f.FileInfo().IsDir() {
			if err := os.MkdirAll(outPath, 0o755); err != nil {
				return err
			}
			continue
		}
		if err := os.MkdirAll(filepath.Dir(outPath), 0o755); err != nil {
			return err
		}
		rc, err := f.Open()
		if err != nil {
			return err
		}
		w, err := os.OpenFile(outPath, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, f.Mode())
		if err != nil {
			_ = rc.Close()
			return err
		}
		_, copyErr := io.Copy(w, rc)
		_ = w.Close()
		_ = rc.Close()
		if copyErr != nil {
			return copyErr
		}
	}
	return nil
}

func fatal(format string, args ...any) {
	fmt.Fprintf(os.Stderr, "OpenSpider launcher: "+format+"\n", args...)
	os.Exit(1)
}
