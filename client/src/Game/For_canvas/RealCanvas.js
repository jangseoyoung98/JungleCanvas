import React,{ useRef, useEffect, useState, useMemo } from "react";
import socket from '../../Openvidu/socket';
import {ButtonGroup, Button} from 'react-bootstrap';
// YEONGWOO: 지금 안쓰지만 혹시 몰라서 남겨둔 import 
// JANG: 아래 주석 해제하면 Chakra 사용 불가능!
// import exp from "constants";
// import { emit } from "process";
// import io, { Socket } from 'socket.io-client';
// import { relative } from "path";
import useStore from "../../store";
// YEONGWOO: 색상 선택, 아이콘 추가
import { GithubPicker } from 'react-color';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import CircleIcon from '@mui/icons-material/Circle';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { red, green } from '@mui/material/colors';

const RealCanvas = ({mySessionId, myUserName}) => {
    const current = useRef({
        color: 'black',
        x: 0,
        y: 0,
    });
    const [color, setColor] = useState('#000000');
    // Add state for the pen's thickness
    const [thickness, setThickness] = useState(2);

    //JUNHO: 캔버스 크기 조정 문제 해결
    const canvasInitializedRef = useRef(false);

    const canvasRef = useRef(null);
    const socketRef = useRef(null);
    const { iAmPainter, spyPainter, mode } = useStore(
        state => ({
            iAmPainter: state.iAmPainter,
            spyPainter: state.spyPainter,
            mode: state.mode,
        })
    );

    // YEONGWOO: 굵기 선택 방식 수정
    const changeLineWidth = (newWidth) => {
        setThickness(newWidth);
        current.lineWidth = newWidth;
    };

    // YEONGWOO: colorpicker 수정
    const onChangeComplete = (colors) => {
        console.log(colors);
        current.color = colors.hex;
        setColor(colors.hex);
    };

    // YEONGWOO: clearCanvas 동기화
    const handleClearCanvas = () => {
        socketRef.current.emit('clearCanvas');
    };
    
    useEffect(() => {
        const canvas = canvasRef.current;
        //JUNHO: canvas 크기 조정
        // const parent = canvas.parentElement;
        // const width = parent.offsetWidth * 0.95;
        // const height = parent.offsetHeight * 0.95;

        // canvas.width = width * 2;
        // canvas.height = height * 2;
        // canvas.style.width = `${width}px`;
        // canvas.style.height = `${height}px`;
        // JANG: 08.06 - 캔버스 그림자 효과 제거함..!
        // canvas.style.boxShadow = "10px 10px 5px grey";

        //JUNHO: canvas 크기 조정 끝

        const context = canvas.getContext("2d");    
        

        //YEONGWOO: 색상 선택
        const colors = document.getElementsByClassName('color');
        
        // loop through the color elements and add the click event listeners
        for (let i = 0; i < colors.length; i++) {
            colors[i].addEventListener('click', () => onChangeComplete(colors[i].style), false);
        }

        const clearCanvas = () => {
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        }
        const clearBtn = document.getElementsByClassName('clearBtn')[0];
        clearBtn.addEventListener('click', clearCanvas, false);

        let drawing = false;

        // create the drawing

        const draw = (x0,y0,x1,y1,color,lineWidth,emit) => {
            context.beginPath();
            context.lineCap = "round";   
            context.moveTo(x0,y0);
            context.lineTo(x1,y1);
            context.strokeStyle = color;
            context.lineWidth = lineWidth;
            context.stroke();
            context.closePath();

            if(!emit) {return;}

            const w = canvas.width ;
            const h = canvas.height ;

            if(!socketRef.current) return;
            socketRef.current.emit('drawing', {
                mySessionId: mySessionId,
                x0: x0 / w,
                y0: y0 / h,
                x1: x1 / w,
                y1: y1 / h,
                color,
                lineWidth
            });
        };
        
        
        // mouse movement

        const onMouseDown = (e) => {
            drawing = true;
            const rect = canvas.getBoundingClientRect(); // get the bounding rectangle
            current.x = e.clientX - rect.left
            current.y = e.clientY - rect.top
        };

        const onMouseMove = (e) => {
            if(!drawing){return;}
            const rect = canvas.getBoundingClientRect(); // get the bounding rectangle
            draw(
                current.x,
                current.y,
                e.clientX - rect.left, 
                e.clientY - rect.top,
                current.color,
                current.lineWidth,
                true
            );
            current.x = e.clientX - rect.left;
            current.y = e.clientY - rect.top;    
        };

        const onMouseUp = (e) => {
            if(!drawing){return;}
            drawing = false;
            const rect = canvas.getBoundingClientRect(); // get the bounding rectangle
            draw(
                current.x,
                current.y,
                e.clientX - rect.left,
                e.clientY - rect.top,
                current.color,
                current.lineWidth,
                true
            );
        };

        const throttle = (callback, delay) => {
            let previousCall = new Date().getTime();
            return function() {
                const time = new Date().getTime();

                if((time - previousCall) >= delay) {
                    previousCall = time;
                    callback.apply(null, arguments);
                }
            };
        };

        // add event listeners
        // MRSEO: drawable 여부에 따라 이벤트 리스너 추가
        if ( ( mode === 'competition' && iAmPainter ) || ( mode === 'spy' && spyPainter )) {
            canvas.addEventListener('mousedown', onMouseDown, false);
            canvas.addEventListener('mousemove', throttle(onMouseMove, 10), false);
            canvas.addEventListener('mouseup', onMouseUp, false);
            canvas.addEventListener('mouseout', onMouseUp, false);
        } else {
            canvas.removeEventListener('mousedown', onMouseDown, false);
            canvas.removeEventListener('mousemove', throttle(onMouseMove, 10), false);
            canvas.removeEventListener('mouseup', onMouseUp, false);
            canvas.removeEventListener('mouseout', onMouseUp, false);
        }

        
        const onResize = () => {
            if(!canvasInitializedRef.current){
                const parent = canvas.parentElement;
                const width = parent.offsetWidth * 0.95;
                const height = parent.offsetHeight * 0.95;

                canvas.width = width * 2;
                canvas.height = height * 2;
                canvas.style.width = `${width}px`;
                canvas.style.height = `${height}px`;

                canvas.style.boxShadow = "10px 10px 5px grey";

                context.scale(2, 2);

                canvasInitializedRef.current = true;
            }
        }

        window.addEventListener('resize', onResize, false);
        onResize();

        // socket.io connection
        const onDrawingEvent = (data) => {
            const w = canvas.width;
            const h = canvas.height;
            draw(
                data.x0 * w, 
                data.y0 * h, 
                data.x1 * w, 
                data.y1 * h,
                data.color,
                data.lineWidth,
                false
            );
        };

        socketRef.current = socket;
        socketRef.current.emit('joinRoom', { mySessionId, myUserName });  // Emit 'joinRoom' event
        socketRef.current.on('drawing', onDrawingEvent);
        // YEONGWOO: clearCanvas 동기화
        socketRef.current.on('clearCanvas', clearCanvas);

         // Cleanup when the component is unmounted or drawable changes.
         // MRSEO: 
        return () => {
            socketRef.current.off('drawing', onDrawingEvent);
            canvas.removeEventListener('mousedown', onMouseDown, false);
            canvas.removeEventListener('mousemove', throttle(onMouseMove, 10), false);
            canvas.removeEventListener('mouseup', onMouseUp, false);
            window.removeEventListener('resize', onResize, false);
        };

    }, [iAmPainter,spyPainter, socketRef]);

    //YEONGWOO: 색상 선택 버튼
    let [toggle, setToggle] = useState(false);
    const handleToggle = () => {
        setToggle(!toggle);
    };

    const colors = [
        '#F44336',
        '#E91E63',
        '#9C27B0',
        '#673AB7',
        '#3F51B5',
        '#2196F3',
        '#03A9F4',
        '#00BCD4',
        '#009688',
        '#4CAF50',
        '#8BC34A',
        '#CDDC39',
        '#FFEB3B',
        '#FFC107',
        '#FF9800',
        '#FF5722',
        '#795548',
        '#607D8B',
        '#000000',
    ];

    return (
        <div className="RealCanvas_1" style={{width: "100%", height: "100%"}}>
            <canvas ref={canvasRef} className="whiteboard" style={{width: "90%", height: "90%"}}/>
            {/* YEONGWOO: clearCanvas 동기화, colorpicker수정, icon 수정 */}
            <div className="btn_zone" style ={{ display: 'flex', justifyContent: 'center',alignItems: 'center', gap: '20px', margin: 'auto' }}>
                <div>
                    <ColorLensIcon
                        onClick={handleToggle}
                        className="palleteBtn"
                        sx={{ fontSize: 50, color: green[500] }}
                    />
                </div>
                <div>
                    <CircleIcon
                        onClick={() => changeLineWidth(2)}
                        sx={{ fontSize: 10, color: color }}
                    />
                </div>
                <div>
                    <CircleIcon
                        onClick={() => changeLineWidth(6)}
                        sx={{ fontSize: 20, color: color }}
                    />
                </div>
                <div>
                    <CircleIcon
                        onClick={() => changeLineWidth(12)}
                        sx={{ fontSize: 30, color: color }}
                    />
                </div>
                <div>
                    <CircleIcon
                        onClick={() => changeLineWidth(20)}
                        sx={{ fontSize: 40, color: color }}
                    />
                </div>
                <div>
                    <DeleteForeverIcon
                        className="clearBtn"
                        onClick={handleClearCanvas}
                        sx={{ fontSize: 50, color: red[500] }}
                    />
                </div>
                
            </div>

            {toggle && (
                <GithubPicker
                    width="auto"
                    colors={colors}
                    className="color"
                    onChangeComplete={onChangeComplete}
                />
            )}
        </div>
    );
}

export default RealCanvas;