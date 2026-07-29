package store

import (
	"os"
	"path/filepath"
)

const appFolder = "OpenSpider"

// DataRoot returns the per-user OpenSpider data directory.
func DataRoot() string {
	dir, err := os.UserConfigDir()
	if err != nil {
		dir, _ = os.UserHomeDir()
	}
	return filepath.Join(dir, appFolder)
}

func projectsRoot() string {
	return filepath.Join(DataRoot(), "projects")
}

func indexPath() string {
	return filepath.Join(projectsRoot(), "index.json")
}

func projectDir(id string) string {
	return filepath.Join(projectsRoot(), id)
}

func activeProjectDir(activeID *string) string {
	if activeID != nil && *activeID != "" {
		return projectDir(*activeID)
	}
	return DataRoot()
}

func historyDir(activeID *string) string {
	return filepath.Join(activeProjectDir(activeID), "history")
}

func csvExportDir() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return filepath.Join(DataRoot(), "csv")
	}
	return filepath.Join(home, "Documents", "OpenSpider", "csv")
}
