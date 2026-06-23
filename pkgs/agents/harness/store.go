package harness

import "github.com/AlexsanderHamir/Hamix/pkgs/agents/harness/internal/contract"

// Store is the persistence contract required by harness orchestration and
// harness test doubles. See internal/contract for the method list.
type Store = contract.Store
