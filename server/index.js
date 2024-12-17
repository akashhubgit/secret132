const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');
const app = express();
const fs = require('fs');
const ffmpegStatic = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const ffprobe = require('ffprobe-static');
const path = require('path');
const pathtowebsite2 = './website3030/';
//const MemoryStreams = require('memory-streams');
app.use('/static', express.static('./static'));

// Create another Express.js application for the second website
const secondApp = express();

// Replace 'path-to-your-website-directory' with the directory where your second website's files are located
secondApp.use(express.static(pathtowebsite2));

secondApp.get('/', (req, res) => {
    res.sendFile('index.html', {
        root: pathtowebsite2 + 'index.html'
    });
});

// give access to everyone not only localhost cause of the other website
secondApp.listen(3030, '0.0.0.0', () => {
    console.log("Second website running on http://localhost:3030/");
});

app.listen(3000, () => {
    console.log("It Works!");
});

app.get('/', (req, res) => {
    res.sendFile('index.html', {
        root: './'
    });
})

function timeStampToSeconds(timeStampStr) {
    var seconds = 0;
    seconds += parseInt(timeStampStr.charAt(0) + timeStampStr.charAt(1)) * 60;
    seconds += parseInt(timeStampStr.charAt(3) + timeStampStr.charAt(4));

    return seconds;
}

async function getCurrentTime() {
    let now = new Date().toISOString();
    let day = now.substring(8, 10);
    let month = now.substring(5, 7);
    let hours = now.substring(11, 13);

    return day + "." + month + "_" + hours + "-";
}

async function createFailureLog(errorString, ytName) {
    let time = getCurrentTime();

    fs.appendFile('./logs/failure/' + time + ytName + ".txt", errorString, (err) => {
        if (err) {
            console.error('Error creating failure log:\n ', err);
        }
    });
}

async function createSuccessLog(ytName) {
    var time = getCurrentTime();

    fs.appendFile('./logs/success/' + time + ytName + ".txt", "", (err) => {
        if (err) {
            createFailureLog('Error createSuccessLog(): creating log file:\n ' + err, ytName);
        }
    });
}

async function deleteFiles(ytName) {
    // ATTENTION: COULD BE RACE CONDITION!
    // USER 1: downloads but USER 2 download same yt -> deletes ongoing download of USER 1
    let filesToDel = [ `./temp/${ytName}.mp3`, 
                        `./temp/${ytName}.mp4`, 
                        `./temp/${ytName}_t.mp3`,
                        `./temp/${ytName}_t.mp4`,
                        `./temp/${ytName}_a.mp4`,
                        `./temp/${ytName}_v.mp4`];
    filesToDel.forEach(async (filePath) => {
        if (fs.existsSync(filePath)) {
            fs.unlink(filePath, (err) => {
                if (err) {
                    createFailureLog('Error deleteFiles(): deleting file:\n' + err, ytName);
                }
            });
        }
    });

}

async function getYTName(data) {
    return new Promise((resolve, reject) => {
        var stream = data.get("stream");
        stream.on('info', (info) => {
            ytName = info.videoDetails.title.replace(/[#<>$+%!^&*´``~'|{}?=/\\@]/g, '-').replace(/ä/g, 'ae').replace(/ü/g, 'ue').replace(/ö/g, 'oe');
            //console.log("getYTName DONE!");
            data.set("ytName", ytName);
            resolve(data);
        });
    })
}

async function downloadMP4BadQuality(data) {
    return new Promise((resolve, reject) => {
        var stream = data.get("stream");
        var ytName = data.get("ytName");
        var outputFilePath = `./temp/${ytName}.mp4`;
        data.set("outputFilePath", outputFilePath);

        stream.pipe(fs.createWriteStream(outputFilePath))
            .on('finish', () => {
                resolve(data);
            })
            .on('error', () => {
                createFailureLog("Error downloadMP4BadQuality(): \n", ytName);
                reject();
            });
        //console.log("downloadMP4BadQuality DONE!");

    });
}

async function mergeVideoAndAudio(data) {
    return new Promise((resolve, reject) => {
        let outputFilePath = data.get("outputFilePath");
        let videoFilePath = data.get("videoFilePath");
        let audioFilePath = data.get("audioFilePath");

        ffmpeg()
            .input(videoFilePath)
            .input(audioFilePath)
            .outputOptions('-c:v', 'copy') // Copy video stream
            .outputOptions('-c:a', 'aac') // Encode audio stream using AAC
            .outputOptions('-strict', 'experimental') // Enable experimental codecs
            .save(outputFilePath)
            .on('end', () => {
                resolve(data); 
            })
            .on('error', (err) => {
                console.error('Error:', err);
                reject(err);
            });
    });
}

async function downloadMP4Video(videoStream, videoFilePath) {

    await new Promise((resolve, reject) => videoStream.pipe(fs.createWriteStream(videoFilePath))
                                            .on('finish', () => {
                                                resolve();
                                            })
                                            .on('error', reject));

    console.log("downloadMP4Video DONE!");
}

async function downloadMP4Audio(audioStream, audioFilePath) {
    await new Promise((resolve, reject) => audioStream.pipe(fs.createWriteStream(audioFilePath))
                                            .on('finish', () => {
                                                resolve();
                                            })
                                            .on('error', reject));

    console.log("downloadMP4Audio DONE!");
}

async function downloadMP4GoodQuality(data) {
    return new Promise(async (resolve, reject) => {

        var ytName = data.get("ytName");
        var videoStream = data.get("videoStream");
        var audioStream = data.get("audioStream");
        

        var videoFilePath = `./temp/${ytName}_v.mp4`;
        var audioFilePath = `./temp/${ytName}_a.mp4`;
        var outputFilePath = `./temp/${ytName}.mp4`;

        data.set("outputFilePath", outputFilePath);
        data.set("videoFilePath", videoFilePath);
        data.set("audioFilePath", audioFilePath);

        const videoPromise = downloadMP4Video(videoStream, videoFilePath);
        const audioPromise = downloadMP4Audio(audioStream, audioFilePath);

        await Promise.all([videoPromise, audioPromise]).then(() => resolve(data));
    });
}


async function convertMP4ToMP3(data) {
    var ytName = data.get("ytName");
    var oldOutputFilePath = data.get("outputFilePath");

    let filePath_mp3 = `./temp/${ytName}.mp3`; 
    data.set("outputFilePath", filePath_mp3);

    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(oldOutputFilePath)
            .output(filePath_mp3)
            .audioCodec('libmp3lame')
            .on('error', reject)
            .on('end', () => resolve(data))
            .run();
        console.log("convertMP4toMP3 DONE!\n");
    });
}

async function trimFile(data) {
    return new Promise((resolve, reject) => {
        let duration = data.get("duration");
        if (duration > 0) {
            console.log("trimming starting broo");
            let outputFilePath = data.get("outputFilePath");
        
            let trimStartTime = data.get("trimStartTime");

            let dotIndex = outputFilePath.lastIndexOf(".");
            let trimmedOutputFilePath = outputFilePath.substring(0, dotIndex) + "_t" + outputFilePath.substring(dotIndex);


            ffmpeg(outputFilePath)
                //      .setFfmpegPath(ffmpegStatic)
                //      .setFfprobePath(ffprobe.path)
                .output(trimmedOutputFilePath)
                .setStartTime(trimStartTime)
                .setDuration(duration)
                //      .withVideoCodec('copy')
                //      .withAudioCodec('copy')
                .on('end', function(err) {
                    if (!err) {
                        console.log('trimming Done');
                    }
                    data.set("outputFilePath", trimmedOutputFilePath);
                    resolve(data);
                })
                .on('error', function(err) {
                    console.log('error in trimFile(): ', err);
                })
                .run();

        } else {
            resolve(data);
        }
    });
}

async function sendFile_and_PostProcessing(data) {
    return new Promise((resolve, reject) => {
        let res = data.get("res");
        let outputFilePath = data.get("outputFilePath");
        let ytName = data.get("ytName");

        res.download(outputFilePath, async (err) => {
            if (err) {
                console.error('Error in res.download()...:', err);
            } else {
                console.log('File sent successfully');
                
                deleteFiles(ytName);

                createSuccessLog(ytName);
            }
        });

    });
}

function downloadMp3(data) {
    // MP3 Download    

    let url = data.get("url");

    console.log(url);

    var stream = ytdl(url, {
        format: 'mp4',
        filter: 'audioonly'
    });
 
    data.set("stream", stream);

    getYTName(data)
        .then(downloadMP4BadQuality)
        .then(convertMP4ToMP3)
        .then(trimFile)
        .then(sendFile_and_PostProcessing);

    return;
}

function downloadMp4_BadQuality(data) {

    let url = data.get("url");

    var stream = ytdl(url
    ,{
        //format: 'lowest',
        //quality: 'lowestvideo',
        filter: 'videoandaudio'
        }
    );

    data.set("stream", stream);

    getYTName(data)
        .then(downloadMP4BadQuality)
        .then(trimFile)
        .then(sendFile_and_PostProcessing);
        
    return;

}

function downloadMp4_GoodQuality(data) {

    let url = data.get("url");

    var videoStream = ytdl(url, {
        format: 'mp4'
    });

    var audioStream = ytdl(url, {
        format: 'mp4',
        filter: 'audioonly'
    });

    data.set("stream", videoStream);
    data.set("videoStream", videoStream);
    data.set("audioStream", audioStream);
    
    getYTName(data)
        .then(downloadMP4GoodQuality)
        .then(mergeVideoAndAudio)
        .then(trimFile)
        .then(sendFile_and_PostProcessing);

    return;
}

app.get('/download', async (req, res) => {
    try {
        console.log(req.query);
        const url = req.query.url;
        const downloadType = req.query.downloadType;


        const trimCheckboxValue = req.query.trimCheckboxValue;        
        var duration = -1;
        var trimStartTime = -1;

        if (!trimCheckboxValue.localeCompare('on')) {
            trimStartTime = timeStampToSeconds(req.query.cutFrom);
            const cutToSecs = timeStampToSeconds(req.query.cutTo);

            console.log(trimStartTime + " und " + cutToSecs);
            var duration = cutToSecs - trimStartTime;
            console.log("dur = " + duration);
        }
        
        var data = new Map();
        data.set("url", url);
        data.set("duration", duration);
        data.set("trimStartTime", trimStartTime);
        data.set("res", res);

        if (!downloadType.localeCompare('mp3')) {
            downloadMp3(data);
        } else {
            // MP4 Download            
            const quality = req.query.videoQuality;

            if (!quality.localeCompare('bad')) {

                downloadMp4_BadQuality(data);

            } else {

                downloadMp4_GoodQuality(data);
            }
        }

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Aywa versuch mal nochmal neu (wenn wieder net klappt schick pls Bild an AK)' +
            '\n' + '\n' + '\n' + error);
    }
});
