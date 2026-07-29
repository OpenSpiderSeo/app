package system

import (
	"bufio"
	"os"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/openspider/openspider/internal/types"
)

var (
	cpuMu       sync.Mutex
	lastIdle    uint64
	lastTotal   uint64
	lastSample  time.Time
	hasCPUSample bool
)

// LoadSnapshot samples host CPU/RAM for the sidebar HUD.
func LoadSnapshot() types.SystemLoadSnapshot {
	total, avail := readMem()
	used := total - avail
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

func readMem() (total, available uint64) {
	if runtime.GOOS == "linux" {
		return readMemLinux()
	}
	var ms runtime.MemStats
	runtime.ReadMemStats(&ms)
	// Non-Linux fallback: process RSS only (total unknown → hide RAM % in UI).
	return 0, 0
}

func readMemLinux() (total, available uint64) {
	f, err := os.Open("/proc/meminfo")
	if err != nil {
		return 0, 0
	}
	defer f.Close()

	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := sc.Text()
		if strings.HasPrefix(line, "MemTotal:") {
			total = parseMeminfoKB(line)
		} else if strings.HasPrefix(line, "MemAvailable:") {
			available = parseMeminfoKB(line)
		}
		if total > 0 && available > 0 {
			break
		}
	}
	return total * 1024, available * 1024
}

func parseMeminfoKB(line string) uint64 {
	fields := strings.Fields(line)
	if len(fields) < 2 {
		return 0
	}
	n, err := strconv.ParseUint(fields[1], 10, 64)
	if err != nil {
		return 0
	}
	return n
}

func readCPUPercent() float64 {
	if runtime.GOOS != "linux" {
		return 0
	}
	idle, total := readProcStat()
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

func readProcStat() (idle, total uint64) {
	data, err := os.ReadFile("/proc/stat")
	if err != nil {
		return 0, 0
	}
	line, _, _ := strings.Cut(string(data), "\n")
	if !strings.HasPrefix(line, "cpu ") {
		return 0, 0
	}
	fields := strings.Fields(line)
	if len(fields) < 5 {
		return 0, 0
	}
	var vals []uint64
	for _, f := range fields[1:] {
		n, err := strconv.ParseUint(f, 10, 64)
		if err != nil {
			return 0, 0
		}
		vals = append(vals, n)
	}
	for _, v := range vals {
		total += v
	}
	if len(vals) >= 4 {
		idle = vals[3]
		if len(vals) >= 5 {
			idle += vals[4] // iowait
		}
	}
	return idle, total
}
