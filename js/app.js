let model
let videoWidth, videoHeight
let ctx, canvas
const log = document.querySelector("#array")
const VIDEO_WIDTH = 720
const VIDEO_HEIGHT = 405

// video fallback
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia

// array posities van de vingerkootjes
let fingerLookupIndices = {
    thumb: [0, 1, 2, 3, 4],
    indexFinger: [0, 5, 6, 7, 8],
    middleFinger: [0, 9, 10, 11, 12],
    ringFinger: [0, 13, 14, 15, 16],
    pinky: [0, 17, 18, 19, 20]
}

let data;

//
// start de applicatie
//
async function main() {
    model = await handpose.load()
    const video = await setupCamera()
    video.play()
    startLandmarkDetection(video)
}

// start de webcam
async function setupCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
            "Webcam not available"
        )
    }

    const video = document.getElementById("video")
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
            facingMode: "user",
            width: VIDEO_WIDTH,
            height: VIDEO_HEIGHT
        }
    })
    video.srcObject = stream

    return new Promise(resolve => {
        video.onloadedmetadata = () => {
            resolve(video)
        }
    })
}

// predict de vinger posities in de video stream
async function startLandmarkDetection(video) {

    videoWidth = video.videoWidth
    videoHeight = video.videoHeight

    canvas = document.getElementById("output")

    canvas.width = videoWidth
    canvas.height = videoHeight

    ctx = canvas.getContext("2d")

    video.width = videoWidth
    video.height = videoHeight

    ctx.clearRect(0, 0, videoWidth, videoHeight)
    ctx.strokeStyle = "red"
    ctx.fillStyle = "red"

    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1) // video omdraaien omdat webcam in spiegelbeeld is

    predictLandmarks()
}

// predict de locatie van de vingers met het model
async function predictLandmarks() {
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight, 0, 0, canvas.width, canvas.height)
    // prediction!
    const predictions = await model.estimateHands(video)



    if (predictions.length > 0) {
        const result = predictions[0].landmarks
        drawKeypoints(ctx, result, predictions[0].annotations)

        // positie hoogste wijsvinger kootje
        let ypositionThumb = Math.round(predictions[0].annotations.thumb[3][1])
        let ypositionIndex = Math.round(predictions[0].annotations.indexFinger[3][1])
        let ypositionMiddle = Math.round(predictions[0].annotations.middleFinger[3][1])
        let ypositionRing = Math.round(predictions[0].annotations.ringFinger[3][1])
        let ypositionPinky = Math.round(predictions[0].annotations.pinky[3][1])

        //Kijken welke vinger er van je scherm af is
        // if(ypositionThumb <= 0 ){
        //     console.log('Je duim is van het scherm af')
        // } else if(ypositionIndex <= 0){
        //     console.log('Je indexvinger is van het scherm af')
        // }else if(ypositionMiddle <= 0){
        //     console.log('Je middelvinger is van het scherm af')
        // }else if(ypositionRing <= 0){
        //     console.log('Je ringvinger is van het scherm af')
        // }else if(ypositionPinky <= 0){
        //     console.log('Je pink is van het scherm af')
        // }

        function closestToZero(numbers) {
            if(!numbers.length){
                return 0;
            }
            
            let closest = 0;
            
            for (let i = 0; i < numbers.length ; i++) {
                if (closest === 0) {
                    closest = numbers[i];
                } else if (numbers[i] > 0 && numbers[i] <= Math.abs(closest)) {
                    closest = numbers[i];
                } else if (numbers[i] < 0 && - numbers[i] < Math.abs(closest)) {
                    closest = numbers[i];
                }
            }
            
            return closest;
        }

        const max = [ypositionThumb, ypositionIndex, ypositionMiddle, ypositionRing, ypositionPinky]
       

        //Welke vinger steek ik op, zet neer in UI
        if (closestToZero(max) == ypositionThumb) {
            const thumb = "Dikke thumbs up!"
            log.innerText = thumb
        } else if (closestToZero(max) == ypositionIndex) {
            console.log('Indexvinger')
            log.innerText = "Duidelijk index vinger"
        } else if (closestToZero(max) == ypositionMiddle) {
            console.log('Middelvinger')
            log.innerText = "Je middelvinger?? Hoe durf je!!"
        } else if (closestToZero(max) == ypositionRing) {
            console.log('Ringvinger')
            log.innerText = "Ringvinger!"
        } else if (closestToZero(max) == ypositionPinky) {
            console.log('Pink')
            log.innerText = "Je steekt je pink op, das best knap"
        }
    }

    // 60 keer per seconde is veel, gebruik setTimeout om minder vaak te predicten
    requestAnimationFrame(predictLandmarks)

    // setTimeout(()=>predictLandmarks(), 1000)
}

// toon de eerste 20 waarden in een log - elk punt heeft een X, Y, Z waarde
function logData(predictions) {
    data = 0;
    for (let i = 0; i < 4; i++) {
        data += predictions[0].landmarks[i][0] + ", " + predictions[0].landmarks[i][1] + ", " + predictions[0].landmarks[i][2] + ", "
    }
    log.innerText = data
}

// teken hand en vingers
function drawKeypoints(ctx, keypoints) {
    const keypointsArray = keypoints;

    for (let i = 0; i < keypointsArray.length; i++) {
        const y = keypointsArray[i][0]
        const x = keypointsArray[i][1]
        drawPoint(ctx, x - 2, y - 2, 3)
    }

    const fingers = Object.keys(fingerLookupIndices)
    for (let i = 0; i < fingers.length; i++) {
        const finger = fingers[i]
        //console.log(finger)
        const points = fingerLookupIndices[finger].map(idx => keypoints[idx])
        drawPath(ctx, points, false)
    }
}

// teken een punt
function drawPoint(ctx, y, x, r) {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, 2 * Math.PI)
    ctx.stroke()
}

// teken een lijn
function drawPath(ctx, points, closePath) {
    const region = new Path2D()
    region.moveTo(points[0][0], points[0][1])
    for (let i = 1; i < points.length; i++) {
        const point = points[i]
        region.lineTo(point[0], point[1])
    }

    if (closePath) {
        region.closePath()
    }
    ctx.stroke(region)
}

// start
main()