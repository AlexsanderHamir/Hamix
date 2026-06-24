package repo

// UserDirsPlaceProvider returns OS-resolved profile folders (Documents, Desktop, …)
// as first-class picker roots. Skipped in Docker and when HAMIX_BROWSE_ROOTS is set.
type UserDirsPlaceProvider struct{}

// Places implements PlaceProvider.
//
//funclogmeasure:skip category=hot-path reason="Browse sub-step; operation trace is emitted by ResolveBrowseRoots."
func (UserDirsPlaceProvider) Places(env BrowseEnvironment, _ string) ([]Place, error) {
	if env == BrowseEnvDocker {
		return nil, nil
	}
	return resolveUserDirPlaces()
}
