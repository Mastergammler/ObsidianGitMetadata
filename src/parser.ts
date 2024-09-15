
export interface GitFile {
	ctime: Date;
	mtime: Date;
	history: GitEditHistory[];
}

export interface GitEditHistory {
	date: Date;
	linesAdded: number;
	linesRemoved: number;
}

function parseLogEntry(logEntry: string, map: Map<string, GitFile>) {

	const lines = logEntry.split('\n');

	// parse date
	const dateLine = lines.find(line => line.trim().startsWith('Date:'));
	const dateStr = dateLine?.substring(dateLine.indexOf(":"));
	const date = new Date(dateStr);

	const fileLines = lines.filter(l => /^\d/.test(l)).map(l => {
		// info is spearated by tabs
		const splits = l.split('\t')

		let fileName = splits[2];

		//TODO: handle renames properly
		//-> update map property
		if (fileName.contains(" => ")) {
			//TODO: need to handle rename, which is in {  old => new } 
			//-> and then apply this
			const oldName = fileName.split(" => ")[0];
			fileName = fileName.split(" => ")[1];
		}

		return {
			name: fileName,
			date: date,
			linesAdded: Number(splits[0]),
			linesRemoved: Number(splits[1])
		}
	});

	// parse all lines
	fileLines.forEach(l => {
		if (map.has(l.name)) {
			const entry = map.get(l.name);
			entry.history.push(l as GitEditHistory);
			entry.mtime = l.date;
		}
		else {
			map.set(l.name, { ctime: l.date, mtime: l.date, history: [l as GitEditHistory] });
		}
	});
}

export function parseGithistoryIndex(content: string): Map<string, GitFile> {
	// splitting at author beacuse lower risk of catching a file name
	// - so first entry will be empty
	const splits = content.split('Author:');
	const map = new Map<string, GitFile>();
	splits.forEach(s => parseLogEntry(s, map));

	return map;
}
