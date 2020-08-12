
function checkbox() {
    var checkboxes = document.getElementsByName("language");
    v = 0;
    for (var i = 0; i < checkboxes.length; i++) {
        if (checkboxes[i].type == "checkbox") {
            if (checkboxes[i].checked == true) {
                v += 1;
            }
        }
    };
    if (v > 0) {
        document.getElementById("butAddVideo").disabled = false;
        document.getElementById("languageErr").style.display = 'none';
    } else{
        document.getElementById("butAddVideo").disabled = true;
        document.getElementById("languageErr").style.display = 'block';
    }
};

function getOMdbMovie(){
    const title = document.getElementById('title').value;
    const poster = document.getElementById('poster');
    const omdbErr = document.getElementById('OMdbErr');
        const posterURL = document.getElementById('posterURL');
        const starring = document.getElementById('starring');
    const story = document.getElementById('story');
    const datepicker = document.getElementById('datepicker');
    fetch('https://www.omdbapi.com/?t=' + title + '&apikey=9708aa6c')
    .then((res) => {
        return res.json();
    }).then((data) => {
        if (data.Response === 'False') {
            poster.src = '/img/no-image.jpg';
            omdbErr.style.display = 'inline';
        } else {
            omdbErr.style.display = 'none';
            poster.src = data.Poster;
            starring.value = data.Actors;
            posterURL.value = data.Poster; // hidden input field to submit
            story.value = data.Plot;
            datepicker.value = moment(new Date(data.Released)).format('DD/MM/YYYY');
        }
    }).catch(error => {omdbErr.innerHTML = error;})
};
function resetpass() {
    location.replace("http://localhost:5000/user/resetPassword")
};

function titleCase() {
    const title = document.getElementById('title');
    var splitstr = title.value.toLowerCase().split(' ');
    for (var i=0; i < splitstr.length; i++){
        splitstr[i] = splitstr[i].charAt(0).toUpperCase() + splitstr[i].substring(1);
    }
    title.value = splitstr.join(' ')
};


$('#posterUpload').on('change', function(){
    let image = $("#posterUpload")[0].files[0];
    let formdata = new FormData();
    formdata.append('posterUpload', image);
    $.ajax({
        url: '/video/upload',
            type: 'POST',
        data: formdata,
        contentType: false,
        processData: false,
        'success':(data) => {
            $('#poster').attr('src', data.file);
            $('#posterURL').attr('value', data.file);// sets posterURL hidden field
            if(data.err){
                $('#posterErr').show();
                $('#posterErr').text(data.err.message);
            } else{
                $('#posterErr').hide();
            }
        }   
    });
});
