package system_test

import (
	"runtime"
	"testing"
	"time"

	"github.com/openspider/openspider/internal/system"
)

func TestLoadSnapshotHasHostMemoryOnSupportedOS(t *testing.T) {
	switch runtime.GOOS {
	case "linux", "windows":
	default:
		t.Skip("no host memory sampler on", runtime.GOOS)
	}

	// First CPU sample seeds counters; second after interval yields a reading on linux/windows.
	_ = system.LoadSnapshot()
	time.Sleep(250 * time.Millisecond)
	snap := system.LoadSnapshot()

	if snap.RAMTotalBytes == 0 {
		t.Fatalf("expected non-zero RAM total on %s, got %+v", runtime.GOOS, snap)
	}
	if snap.RAMUsedBytes == 0 && snap.RAMPercent == 0 {
		// Possible on a nearly empty VM but unlikely; still require total.
		t.Logf("warn: used/percent zero: %+v", snap)
	}
	if snap.RAMPercent < 0 || snap.RAMPercent > 100.5 {
		t.Fatalf("ramPercent out of range: %v", snap.RAMPercent)
	}
	if snap.CPUPercent < 0 || snap.CPUPercent > 100.5 {
		t.Fatalf("cpuPercent out of range: %v", snap.CPUPercent)
	}
}
