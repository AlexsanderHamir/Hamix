//go:build !windows && !darwin && !linux

package repo

func resolveUserDirPlaces() ([]Place, error) {
	return nil, nil
}
