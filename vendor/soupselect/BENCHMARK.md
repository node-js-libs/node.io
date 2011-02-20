A log of benchmarks to track changes across releases. See benchmark.js

2010.10.06, version 0.1.0
-------------------------

    body : 4ms, 1 elements
    div : 3ms, 51 elements
    body div : 7ms, 51 elements
    div p : 4ms, 137 elements
    div p a : 3ms, 29 elements
    .note : 3ms, 14 elements
    div.example : 2ms, 43 elements
    ul .tocline2 : 3ms, 12 elements
    #title : 0ms, 1 elements
    h1#title : 0ms, 1 elements
    div #title : 3ms, 1 elements
    ul.toc li.tocline2 : 2ms, 12 elements
    div[class] : 3ms, 51 elements
    div[class=example] : 2ms, 43 elements
    div[class^=exa] : 3ms, 43 elements
    div[class$=mple] : 3ms, 43 elements
    div[class*=e] : 2ms, 50 elements
    div[class|=dialog] : 5ms, 0 elements
    div[class!=made_up] : 2ms, 51 elements
    div[class~=example] : 6ms, 43 elements
