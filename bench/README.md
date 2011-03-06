**Nothing to see here yet..**

To compile `word_count.c`

    $ gcc -ansi -O3 word_count.c hashmap.c -o word_count

To count words using C (_Note: input.txt needs to be a decent size - I use 1GB of lorem_)

    $ time ./word_count < input.txt

To count words using node.io and 1 process

    $ time node.io word_count_nodeio < input.txt

To count words using node.io and 4 processes

    $ time node.io -f 4 word_count_nodeio < input.txt

To count words using a basic .js file

    $ time node word_count_basic.js < input.txt
