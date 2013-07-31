mml: project.mml

setup:
	npm install -g js-yaml

install:
	mkdir -p ${HOME}/Documents/MapBox/project
	ln -s `pwd` ${HOME}/Documents/MapBox/project/GGNPC-basemap

clean:
	rm project.mml

project.mml: project.yml
	js-yaml --to-json project.yml > project.mml
