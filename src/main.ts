import { App, Editor, MarkdownView, MetadataCache, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, Vault } from 'obsidian';
import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as parser from './parser'
import { GitFile } from './parser'

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

const execAsync = promisify(exec);

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		const indexFileName = "index.git-index-metadata";
		const vaultPath = this.app.vault.adapter.getBasePath();

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'git-index-metadata',
			name: 'Index git timestamps',
			callback: async () => {

				//NOTE: get file function is too stupid to find when it's an extension only

				// write history to file
				new Notice('Start indexing, this might take a sec');
				const { stdout, stderr } = await execAsync(`git --no-pager log --date=iso --numstat --reverse > ${indexFileName}`, { cwd: vaultPath });
				if (stderr) new Notice('Git error: ' + stderr);
				else new Notice('Indexing to file done');

			}
		});

		this.addCommand({
			id: 'git-parse-index',
			name: 'Apply current git index',
			callback: async () => {

				const file = this.app.vault.getAbstractFileByPath(indexFileName);
				const content = await this.app.vault.cachedRead(file);
				const gitFileMap = parser.parseGithistoryIndex(content);

				console.log(gitFileMap);
				const allFiles = this.app.vault.getMarkdownFiles();
				const fileCache = this.app.metadataCache;


				const dataview = this.app.plugins.plugins.dataview.api;
				const allpages = dataview.pages();

				allpages.forEach(f => addToFileMedata(f, fileCache, gitFileMap));
			}
		});

		function addToFileMedata(dvPage: any, metadataCache: MetadataCache, metadata: Map<string, GitFile>) {

			const file = dvPage.file;

			if (!metadata.has(file.name)) {
				//console.log("No metadata found for file: ", file.name)
				return;
			}

			console.log("Found metadata for", file.name);
			console.log(file);
			const cache = metadataCache.getFileCache(file)
			console.log(cache)
			const gitMetadata = metadata.get(file.name);

			if (!file.git) file.git = {}

			Object.assign(file.git, gitMetadata);
		}

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
