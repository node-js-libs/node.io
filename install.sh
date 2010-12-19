install() {
    mkdir -p /tmp/$2 \
        && cd /tmp/$2 \
        && echo "... installing $2" \
        && curl -# -L "http://github.com/$1/$2/tarball/master" \
            | tar xz --strip 1 \
        && mkdir -p ~/.node_libraries \
        && cp -fr lib/$2 ~/.node_libraries/$2
}

installcc() {
    mkdir -p /tmp/$2 \
        && cd /tmp/$2 \
        && echo "... building $2" \
        && node-waf configure build \
        && echo "... installing $2" \
        && curl -# -L "http://github.com/$1/$2/tarball/master" \
            | tar xz --strip 1 \
        && mkdir -p ~/.node_libraries \
        && cp -fr lib/$2 ~/.node_libraries/$3
}

install chriso node-validator validator \
    && install harryf node-soupselect soupselect \
    && install jashkenas coffee-script \
    && installcc indexzero daemon.node daemon \
    && install chriso packnode \
    && install chriso node.io \
    && cp -f /tmp/packnode/bin/packnode /usr/local/bin/packnode \
    && cp -f /tmp/coffee-script/bin/coffee /usr/local/bin/coffee \
    && cp -f /tmp/node.io/bin/node.io /usr/local/bin/node.io \
    && cp -f /tmp/node.io/bin/node.io-web /usr/local/bin/node.io-web \
    && echo "... installation complete"