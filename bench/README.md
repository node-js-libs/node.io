**Nothing to see here yet..**

`word_count.c` was something I hacked together to compare to `word_count.js` 

To compile `word_count.c` 

    $ gcc -ansi -O3 word_count.c hashmap.c -o word_count
        
Then to compare the speed of `word_count.c` and `word_count.js`
    
    $ time ./word_count < input.txt
    $ time node.io word_count < input.txt
    $ time node.io -f 4 word_count < input.txt

Note: input.txt needs to be a decent size (I use 1GB of lorem)