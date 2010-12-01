var last_line = '', words = {}, line, i, l, j, k;

function count_words(lines) {
    for (i = 0, l = lines.length; i < l; i++) {
        line = lines[i].split(' ');
        for (j = 0, k = line.length; j < k; j++) {
            words[line[j]] = typeof words[line[j]] === 'undefined' ? 1 : words[line[j]] + 1;
        }
    }
}
    
var stream = process.openStdin()

stream.setEncoding('utf8');

stream.on('data', function (data) {
    data = last_line + data;
    data = data.split('\n');
    last_line = data.pop();
    count_words(data);
});

stream.on('end', function () {
    count_words([last_line]);
});