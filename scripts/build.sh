#!/bin/sh
echo "Building Application..."
echo "Removing existing build directory if it exists"
rm -rf build/

echo "Compiling Typescript"
./node_modules/.bin/tsc
[ $? -eq 0 ] || exit 1

cp -r ./public ./build/

echo "Packaging Binaries"
./node_modules/.bin/pkg -C Brotli package.json
