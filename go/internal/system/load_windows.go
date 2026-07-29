//go:build windows

package system

import (
	"syscall"
	"unsafe"
)

var (
	modKernel32          = syscall.NewLazyDLL("kernel32.dll")
	procGlobalMemoryStatusEx = modKernel32.NewProc("GlobalMemoryStatusEx")
	procGetSystemTimes   = modKernel32.NewProc("GetSystemTimes")
)

type memoryStatusEx struct {
	Length               uint32
	MemoryLoad           uint32
	TotalPhys            uint64
	AvailPhys            uint64
	TotalPageFile        uint64
	AvailPageFile        uint64
	TotalVirtual         uint64
	AvailVirtual         uint64
	AvailExtendedVirtual uint64
}

func readMem() (total, available uint64) {
	var ms memoryStatusEx
	ms.Length = uint32(unsafe.Sizeof(ms))
	r1, _, _ := procGlobalMemoryStatusEx.Call(uintptr(unsafe.Pointer(&ms)))
	if r1 == 0 {
		return 0, 0
	}
	return ms.TotalPhys, ms.AvailPhys
}

type filetime struct {
	LowDateTime  uint32
	HighDateTime uint32
}

func filetimeToUint64(ft filetime) uint64 {
	return uint64(ft.HighDateTime)<<32 | uint64(ft.LowDateTime)
}

func readCPUTimes() (idle, total uint64) {
	var idleFT, kernelFT, userFT filetime
	r1, _, _ := procGetSystemTimes.Call(
		uintptr(unsafe.Pointer(&idleFT)),
		uintptr(unsafe.Pointer(&kernelFT)),
		uintptr(unsafe.Pointer(&userFT)),
	)
	if r1 == 0 {
		return 0, 0
	}
	idle = filetimeToUint64(idleFT)
	kernel := filetimeToUint64(kernelFT) // includes idle on Windows
	user := filetimeToUint64(userFT)
	total = kernel + user
	return idle, total
}
