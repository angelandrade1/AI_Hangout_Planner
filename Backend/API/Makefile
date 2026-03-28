init-env-windows:
	cd ../ && type nul > .env && copy .env.example .env

init-env-mac:
	cd ../ && touch .env && cp .env.example .env

setup-venv:
	python3 -m venv venv && ./venv/Scripts/activate 

install:
	cd ../ && pip3 install -r requirements.txt

run-local:
	uvicorn main:app --reload