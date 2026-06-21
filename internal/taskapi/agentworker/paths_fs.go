package agentworker

import "os"

// pathProbeFS abstracts the filesystem checks in paths.go (stat, mkdir, temp
// probe write). Production wires osPathProbeFS; tests replace pathProbe with a
// fake implementation — assign pathProbe in paths_test.go or call
// withPathProbeFSForTest from an agentworker_test if cross-package setup is needed.
type pathProbeFS interface {
	Stat(name string) (os.FileInfo, error)
	MkdirAll(path string, perm os.FileMode) error
	CreateTemp(dir, pattern string) (path string, err error)
	Remove(path string) error
}

type osPathProbeFS struct{}

//funclogmeasure:skip category=hot-path reason="Thin os stdlib delegate; operation trace is emitted by paths.go chokepoints."
func (osPathProbeFS) Stat(name string) (os.FileInfo, error) {
	return os.Stat(name)
}

//funclogmeasure:skip category=hot-path reason="Thin os stdlib delegate; operation trace is emitted by paths.go chokepoints."
func (osPathProbeFS) MkdirAll(path string, perm os.FileMode) error {
	return os.MkdirAll(path, perm)
}

//funclogmeasure:skip category=hot-path reason="Thin os stdlib delegate; operation trace is emitted by paths.go chokepoints."
func (osPathProbeFS) CreateTemp(dir, pattern string) (string, error) {
	f, err := os.CreateTemp(dir, pattern)
	if err != nil {
		return "", err
	}
	name := f.Name()
	if err := f.Close(); err != nil {
		return name, err
	}
	return name, nil
}

//funclogmeasure:skip category=hot-path reason="Thin os stdlib delegate; operation trace is emitted by paths.go chokepoints."
func (osPathProbeFS) Remove(path string) error {
	return os.Remove(path)
}

var pathProbe pathProbeFS = osPathProbeFS{}
