// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license

import { styled } from "@linaria/react";
import * as base64 from "js-base64";
import React, { useCallback, useMemo, useState } from "react";
import { MessageType, PasteMode } from "../../shared/protocol";
import { useUniqueId } from "./hooks";
import { messageHandler } from "./state";
import { VsButton, VsWidgetPopover } from "./vscodeUi";

const enum Encoding {
	Base64 = "base64",
	Utf8 = "utf-8",
}


const encodings = [
	Encoding.Utf8,
	Encoding.Base64,
];

const encodingLabel: { [key in Encoding]: string } = {
	[Encoding.Base64]: "Base64",
	[Encoding.Utf8]: "UTF-8",
};

const isData: { [key in Encoding]: (data: string) => boolean } = {
	[Encoding.Base64]: d => base64.isValid(d),
	[Encoding.Utf8]: () => true,
};

const decode: { [key in Encoding]: (data: string) => Uint8Array } = {
	[Encoding.Base64]: d => base64.toUint8Array(d),
	[Encoding.Utf8]: d => new TextEncoder().encode(d),
};

const RadioList = styled.div`
	display: flex;
	margin-bottom: 12px;

	> * {
		margin-right: 8px;
	}
`;

const RadioContainer = styled.div`
	display: flex;
	align-items: center;
`;

const EncodingOption: React.FC<{
	value: Encoding;
	enabled: boolean;
	checked: boolean;
	onChecked: (encoding: Encoding) => void;
}> = ({ value, enabled, checked, onChecked }) => {
	const id = useUniqueId();
	return <RadioContainer>
		<input
			id={id}
			type="radio"
			name="encoding"
			disabled={!enabled}
			value={value}
			checked={checked}
			onChange={evt => {
				if (evt.target.checked) {
					onChecked(value);
				}
			}}
		/>
		<label htmlFor={id}>{encodingLabel[value]}</label>
	</RadioContainer>;
};

const InsertionOption: React.FC<{
	value: PasteMode;
	label: string;
	checked: boolean;
	onChecked: (encoding: PasteMode) => void;
}> = ({ value, label, checked, onChecked }) => {
	const id = useUniqueId();
	return <RadioContainer>
		<input
			id={id}
			type="radio"
			name="insertMode"
			value={value}
			checked={checked}
			onChange={evt => {
				if (evt.target.checked) {
					onChecked(value);
				}
			}}
		/>
		<label htmlFor={id}>{label}</label>
	</RadioContainer>;
};

const ButtonWrap = styled.div`
	display: flex;
	width: 100%;
	justify-content: center;
`;

export const PastePopup: React.FC<{
	context?: { target: HTMLElement; data: string; offset: number; };
	hide: () => void;
}> = ({ context, hide }) => {
	const [encoding, setEncoding] = useState(Encoding.Utf8);
	const [mode, setMode] = useState(PasteMode.Replace);
	const decoded: Uint8Array | Error = useMemo(() => {
		try {
			return context ? decode[encoding](context.data) : new Uint8Array();
		} catch (e) {
			return e as Error;
		}
	}, [context, encoding]);

	const decodedValid = decoded instanceof Uint8Array;

	const doReplace = useCallback(() => {
		if (decoded instanceof Uint8Array && context) {
			messageHandler.sendEvent({ type: MessageType.DoPaste, data: decoded, mode, offset: context.offset });
			hide();
		}
	}, [decoded, mode, hide, context?.offset]);

	return <VsWidgetPopover anchor={context?.target || null} hide={hide} visible={!!context}>
		<RadioList>
			<span>Paste as:</span>
			{encodings.map(e => <EncodingOption
				key={e}
				value={e}
				enabled={isData[e](context?.data || "")}
				checked={e === encoding}
				onChecked={setEncoding}
				/>
			)}
		</RadioList>
		<RadioList>
			<span>Paste mode:</span>
			<InsertionOption label="Replace" checked={mode == PasteMode.Replace} value={PasteMode.Replace} onChecked={setMode} />
			<InsertionOption label="Insert" checked={mode == PasteMode.Insert} value={PasteMode.Insert} onChecked={setMode} />
		</RadioList>
		<ButtonWrap>
			<VsButton disabled={!decodedValid} onClick={doReplace}>
				{decodedValid
					? <>{mode === PasteMode.Replace ? "Replace" : "Insert"} {decoded.length} bytes</>
					: "Encoding Error"}
				</VsButton>
		</ButtonWrap>
	</VsWidgetPopover>;
};
