
module.exports = {
    replaceCommas: function(subtitles, target){
        if (subtitles === ''){
            return subtitles.replace('', 'None');
        } else{
        return subtitles.replace(/,/g, target);
        }
    },
};