package jsonutil

import "github.com/openspider/openspider/internal/types"

// NonNilStrings ensures JSON encodes [] instead of null for empty/missing slices.
func NonNilStrings(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}

// NonNilHreflang ensures JSON encodes [] instead of null for empty/missing slices.
func NonNilHreflang(s []types.HreflangRef) []types.HreflangRef {
	if s == nil {
		return []types.HreflangRef{}
	}
	return s
}
