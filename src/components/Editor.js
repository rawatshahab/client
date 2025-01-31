import React, { useEffect, useRef,useState } from "react";
import "codemirror/mode/javascript/javascript";
import "codemirror/theme/dracula.css";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import "codemirror/lib/codemirror.css";
import CodeMirror from "codemirror";
import { ACTIONS } from "../Actions";
import axios from "axios";

function Editor({ socketRef, roomId, onCodeChange }) {
  const [sourceCode, setSourceCode] = useState('');
  
  const [output, setOutput] = useState(""); 
  const [stdin, setStdin] = useState('');
  const editorRef = useRef(null);
  useEffect(() => {
    const init = async () => {
      const editor = CodeMirror.fromTextArea(
        document.getElementById("realtimeEditor"),
        {
          mode: { name: "javascript", json: true },
          theme: "dracula",
          autoCloseTags: true,
          autoCloseBrackets: true,
          lineNumbers: true,
        }
      );
      // for sync the code
      editorRef.current = editor;

      editor.setSize(null, "100%");
      editorRef.current.on("change", (instance, changes) => {
        // console.log("changes", instance ,  changes );
        const { origin } = changes;
        const code = instance.getValue();
        console.log(code,'hello'); // code has value which we write
        onCodeChange(code);
        setSourceCode(code);
        if (origin !== "setValue") {
          socketRef.current.emit(ACTIONS.CODE_CHANGE, {
            roomId,
            code,
          });
        }
      });
    };

    init();
  }, []);
 
  // data receive from server
  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
        if (code !== null) {
          editorRef.current.setValue(code);
        }
      });
    }
    return () => {
      socketRef.current.off(ACTIONS.CODE_CHANGE);
    };
  }, [socketRef.current]);
  useEffect(() => {
    if (socketRef.current) {
        socketRef.current.on(ACTIONS.CODE_EXECUTION_RESULT, ({ output }) => {
            setOutput(output); // Update the output for all users
        });
    }
    return () => {
        socketRef.current.off(ACTIONS.CODE_EXECUTION_RESULT);
    };
}, [socketRef.current]);
  
  const [selectedValue, setSelectedValue] = useState(54);
  const handleChange = (event) => {
    setSelectedValue(event.target.value);
    };

const submitCode = async () => {
      // setLoading(true);
      // setOutput('');
      try {
        // Multiple inputs handling
         const inputs = stdin.split('\n');  // Split stdin into an array of inputs
  
        const response = await axios.post('http://localhost:5001/api/submit-code', {
          sourceCode,           // Send raw source code as is
          languageId: selectedValue, // Send languageId directly
          stdin: inputs,     
          roomId,   // Send an array of inputs (or a single string if preferred)
        });
  
        const { submissionId } = response.data;
  
        const fetchResult = async () => {
          const resultResponse = await axios.get(
            `http://localhost:5001/api/submission-result/${submissionId}`
          );
  
          const { status, stdout, stderr } = resultResponse.data;
          console.log(resultResponse.data,"m data hu");
          if (status.id <= 2) {
            setTimeout(fetchResult, 1000); // Retry fetching result
          } else {
            const output = stdout || stderr || 'Error';
            socketRef.current.emit(ACTIONS.CODE_EXECUTION_RESULT, {
              roomId,
              output,
            });
            setOutput(output);
            // setOutput(
            //   stdout || stderr || 'Error'
            // );
           
            // setLoading(false);
          }
        };
  
        fetchResult();
      } catch (error) {
        console.error('Error:', error);
        // setLoading(false);
      }
    };

  return (
    <div style={{ display: "flex", height: "100vh", flexDirection: "column" }}>
  <div style={{ height: "500px" }}>
    <textarea id="realtimeEditor"></textarea>
  </div>
  
  <div className="compiler" style={{ flex: "1", overflowY: "auto" }}>
    <div style={{display:"flex",justifyContent:"space-between"}}>
    <div style={{display:"flex",justifyContent:"flex-start"}}>
    <button onClick={submitCode}>Compile</button>
      <select value={selectedValue} onChange={handleChange}>
        <option value="54">C++</option>
        <option value="62">Java</option>
        <option value="71">Python</option>
        <option value="63">Javascript</option>
      </select>
    </div>
      <div>
      <textarea 
        placeholder="Enter input "
        value={stdin}
        onChange={(e) => setStdin(e.target.value)}
      ></textarea>
      </div>
     
    </div>
    
    <div style={{ overflow: "auto" }}>
      
      <pre>{output}</pre>
    </div>
  </div>
</div>
    
  );
}

export default Editor;
