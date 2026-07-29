//go:build darwin

package system

import "syscall"

func readMem() (total, available uint64) {
	total, err := syscall.SysctlUint64("hw.memsize")
	if err != nil || total == 0 {
		return 0, 0
	}
	pageSize, err := syscall.SysctlUint64("hw.pagesize")
	if err != nil || pageSize == 0 {
		pageSize = 4096
	}
	free, _ := syscall.SysctlUint64("vm.page_free_count")
	inactive, _ := syscall.SysctlUint64("vm.page_inactive_count")
	available = (free + inactive) * pageSize
	if available > total {
		available = total
	}
	return total, available
}

// CPU tick counters need host_statistics (cgo / x/sys); RAM still works.
func readCPUTimes() (idle, total uint64) {
	return 0, 0
}
