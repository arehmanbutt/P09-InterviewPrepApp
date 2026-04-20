import { type FC, useEffect, useState, useRef } from "react";
import { PencilIcon } from "app/components/icons/PencilIcon.js";
import { useStsQueryParams } from "app/hooks/UseStsQueryParams";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  focusOnMount?: boolean;
}

const InstructionInput: FC<Props> = ({ focusOnMount = false, ...rest }) => {
  const { prompt, updatePromptUrlParam } = useStsQueryParams();
  const [text, setText] = useState(prompt);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const textRef = useRef(text);
  const autofocus = useRef(focusOnMount);

  const handleBlur = () => {
    if (text !== prompt) {
      updatePromptUrlParam(text);
    }
  };

  useEffect(() => {
    if (autofocus.current) {
      inputRef.current?.focus();
    }
  }, [inputRef]);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    return () => {
      updatePromptUrlParam(textRef.current);
    };
  }, [updatePromptUrlParam]);

  return (
    <div {...rest}>
      <label>
        <div className="flex items-center gap-2 text-sm uppercase font-bold font-favorit text-gray-25">
          <PencilIcon />
          Prompt
        </div>
        {prompt && (
          <div className="text-xs text-gray-450 mt-3">{prompt && "* Prompt is user-set"}</div>
        )}
        <textarea
          ref={inputRef}
          className="w-full mt-4 p-4 h-40 border border-gray-700 rounded-lg bg-gray-900 resize-none"
          value={text || ""}
          onChange={({ target: { value } }) => setText(value)}
          onBlur={handleBlur}
          maxLength={7000}
        />
      </label>
    </div>
  );
};

export default InstructionInput;
