package gitexec

import (
	"context"
	"regexp"
	"strconv"
	"strings"
)

// CommitMeta holds author and shortstat metadata for one commit.
type CommitMeta struct {
	Author       string
	AuthorEmail  string
	ParentSHA    string
	FilesChanged int
	Insertions   int
	Deletions    int
}

var (
	shortstatFilesRe = regexp.MustCompile(`(\d+) files? changed`)
	shortstatInsRe   = regexp.MustCompile(`(\d+) insertions?\(\+\)`)
	shortstatDelRe   = regexp.MustCompile(`(\d+) deletions?\(-\)`)
)

// LoadCommitMeta loads author, parent, and --shortstat counters for a commit.
func LoadCommitMeta(ctx context.Context, dir, sha string) (CommitMeta, error) {
	if _, err := Run(ctx, dir, "cat-file", "-e", sha+"^{commit}"); err != nil {
		if isNotFoundErr(err) {
			return CommitMeta{}, ErrNotFound
		}
		return CommitMeta{}, err
	}
	formatOut, err := Run(ctx, dir, "show", sha, "--no-patch", "--format=%an%n%ae%n%P")
	if err != nil {
		if isNotFoundErr(err) {
			return CommitMeta{}, ErrNotFound
		}
		return CommitMeta{}, err
	}
	meta := parseCommitFormat(formatOut)
	statOut, err := Run(ctx, dir, "show", sha, "--shortstat", "--format=")
	if err != nil {
		if isNotFoundErr(err) {
			return CommitMeta{}, ErrNotFound
		}
		return CommitMeta{}, err
	}
	files, ins, del := parseShortstat(statOut)
	meta.FilesChanged = files
	meta.Insertions = ins
	meta.Deletions = del
	return meta, nil
}

func parseCommitFormat(out string) CommitMeta {
	lines := strings.Split(strings.TrimSpace(out), "\n")
	var meta CommitMeta
	if len(lines) > 0 {
		meta.Author = lines[0]
	}
	if len(lines) > 1 {
		meta.AuthorEmail = lines[1]
	}
	if len(lines) > 2 {
		parents := strings.Fields(lines[2])
		if len(parents) > 0 {
			meta.ParentSHA = parents[0]
		}
	}
	return meta
}

func parseShortstat(line string) (files, insertions, deletions int) {
	if m := shortstatFilesRe.FindStringSubmatch(line); len(m) == 2 {
		files, _ = strconv.Atoi(m[1])
	}
	if m := shortstatInsRe.FindStringSubmatch(line); len(m) == 2 {
		insertions, _ = strconv.Atoi(m[1])
	}
	if m := shortstatDelRe.FindStringSubmatch(line); len(m) == 2 {
		deletions, _ = strconv.Atoi(m[1])
	}
	return files, insertions, deletions
}
