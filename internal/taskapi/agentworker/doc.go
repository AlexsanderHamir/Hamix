// Package agentworker owns the in-process agent worker supervisor:
// bounded ready-task queue wiring lives in cmd/taskapi; this package
// reads app_settings, probes/builds runners, spawns worker.Worker
// incarnations, hot-reloads on material changes, and drains on shutdown.
//
// paths.go validates repo roots and worker report directories via pathProbeFS
// (see paths_fs.go): the supervisor must stat directories and write a temp
// probe file before spawning workers, which ties idle/spawn decisions to the
// host filesystem. The seam exists so those checks can run against an in-memory
// fake without touching disk in unit tests — assign pathProbe in tests.
package agentworker
