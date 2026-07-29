//go:build !linux && !windows && !darwin

package system

func readMem() (total, available uint64) {
	return 0, 0
}

func readCPUTimes() (idle, total uint64) {
	return 0, 0
}
