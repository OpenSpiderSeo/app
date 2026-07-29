package system

import (
	"sync"
	"time"

	"github.com/openspider/openspider/internal/types"
)

var (
	cpuMu        sync.Mutex
	lastIdle     uint64
	lastTotal    uint64
	lastSample   time.Time
	hasCPUSample bool
)

// LoadSnapshot samples host CPU/RAM for the sidebar HUD / Settings.
func LoadSnapshot() types.SystemLoadSnapshot {
	total, avail := readMem()
	var used uint64
	if total >= avail {
		used = total - avail
	}
	ramPct := 0.0
	if total > 0 {
		ramPct = float64(used) / float64(total) * 100
	}
	return types.SystemLoadSnapshot{
		CPUPercent:    readCPUPercent(),
		RAMUsedBytes:  used,
		RAMTotalBytes: total,
		RAMPercent:    ramPct,
		SampledAt:     types.NowISO(),
	}
}

// readCPUPercent derives busy% from platform idle/total tick counters (needs ≥2 samples).
func readCPUPercent() float64 {
	idle, total := readCPUTimes()
	if total == 0 {
		return 0
	}

	cpuMu.Lock()
	defer cpuMu.Unlock()

	now := time.Now()
	if !hasCPUSample || now.Sub(lastSample) < 200*time.Millisecond {
		lastIdle = idle
		lastTotal = total
		lastSample = now
		hasCPUSample = true
		return 0
	}

	idleDelta := idle - lastIdle
	totalDelta := total - lastTotal
	lastIdle = idle
	lastTotal = total
	lastSample = now

	if totalDelta == 0 {
		return 0
	}
	busy := float64(totalDelta-idleDelta) / float64(totalDelta) * 100
	if busy < 0 {
		return 0
	}
	if busy > 100 {
		return 100
	}
	return busy
}
