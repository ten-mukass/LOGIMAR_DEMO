#!/bin/bash
DEST="$HOME/Documents/LOGIMAR"
mkdir -p "$DEST"
TARGET="$DEST/logimar-suite"

if [ -d "$TARGET" ]; then
  echo "Target directory $TARGET already exists. Aborting move."
  exit 1
fi

# Move the current directory to the destination
# We use a trick: move the contents or the dir itself.
# Since we are IN the dir, moving the dir itself might separate us from the shell context.
# Better to copy then remove? No, standard mv is fine.
# But we are running this from 'run_command' which is a separate process.
# So we can move the directory specified by absolute path.

CURRENT_DIR=$(pwd)
mv "$CURRENT_DIR" "$TARGET"

echo "Project moved to $TARGET"
