//go:build !windows && !darwin && !linux

package repo

//funclogmeasure:skip category=hot-path reason="Browse sub-step; operation trace is emitted by ResolveBrowseRoots."
func resolveUserDirPlaces() ([]Place, error) {
	return nil, nil
}
