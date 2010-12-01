#include <stdio.h>
#include <string.h>
#include "hashmap.h"

typedef struct data_struct_s {
    char* word;
    int count;
} data_struct_t;

int output_words(void* nl, data_struct_t* container) {
    printf("%u %s\n", container->count, container->word);
    return MAP_OK;
}

int main() {
    
    int read_buffer = 8096, i, l, last_space;
    char input[read_buffer];
    
    int error;
    map_t words = hashmap_new();
    data_struct_t* container;
    
    /* Get input from STDIN */
    while (!feof(stdin)) {
        fgets(input, read_buffer, stdin);
        
        for (i = last_space = 0, l = strlen(input); i <= l; i++) { 
            if (input[i] == ' ' || input[i] == '\n' || input[i] == '\0') {
                
                /* Break up each line into words */
                char* word = (char*) malloc(i - last_space + 1);
                strncpy(word, input + last_space, i - last_space);
                word[i-last_space] = '\0';
                                
                /* Keep a tab on word occurrences */
                error = hashmap_get(words, word, &container);
                if (error == MAP_MISSING) {
                    container = malloc(sizeof(data_struct_t));
                    container->word = word;
                    container->count = 1;
                } else if (error == MAP_FULL) {
                    puts("Map full.");
                    exit(1);
                } else {
                    free(word);
                    container->count = container->count + 1;
                }
                hashmap_put(words, word, container);
                
                last_space = i + 1;
            }
        }
    }
    
    /* Output occurrences */
    hashmap_iterate(words, output_words, NULL);
    
    hashmap_free(words);
    
    return 0;
}
