#!/usr/bin/env bash
set -euo pipefail

echo "PROJECT STATE"
echo -n "commit: "; git rev-parse --short HEAD
echo -n "branch: "; git branch --show-current
echo "tree:"
git ls-files | sed -n '1,200p'
if [ "$(git ls-files | wc -l)" -gt 200 ]; then
  echo "... (more files omitted)"
fi
echo
echo "STATUS"
git status --porcelain
echo
echo "ERRORS / LOG"
echo "<įklijuok klaidas čia>"
echo
echo "REQUEST"
echo "<parašyk tikslą čia>"
