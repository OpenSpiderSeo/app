//go:build linux

package system

import (
	"bufio"
	"os"
	"strconv"
	"strings"
)

func readMem() (total, available uint64) {
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

func readCPUTimes() (idle, total uint64) {
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
